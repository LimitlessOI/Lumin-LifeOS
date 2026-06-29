/**
 * SYNOPSIS: services/builder-truth-surface.js
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * services/builder-truth-surface.js
 *
 * Runtime truth surface read/write with write authority enforcement.
 *
 * Write authority law (BLUEPRINT.md — Runtime Truth Write Authority):
 *   - builder_truth_surfaces is writable ONLY by OIL audit routes
 *   - Builder execution code (builder-supervisor.js) may READ only
 *   - Any call to writeTruthSurface with caller !== 'OIL' throws TRUTH_SURFACE_VIOLATION
 *
 * Surfaces: deploy | migration | queue | environment | operator
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

const VALID_SURFACES = new Set(['deploy', 'migration', 'queue', 'environment', 'operator']);
const TRUTH_SURFACE_VIOLATION = 'TRUTH_SURFACE_VIOLATION';

/** Tier 0 dispatch gate field names (BLUEPRINT.md — Cat-Herding Discipline). */
export const TIER0_DISPATCH_FIELDS = [
  'allowed_files',
  'exact_outcome',
  'rollback_path',
  'telemetry_required',
  'cache_status_required',
  'truncation_detection_required',
  'lower_model_decision_authority',
];

const TRUST_SPINE_TABLES = [
  'builder_truth_surfaces',
  'builder_active_tasks',
  'builder_task_receipts',
  'builder_audit_receipts',
  'builder_halt_log',
  'builder_failure_log',
  'builder_queue_state',
  'builder_replay_baselines',
];

/**
 * Read a truth surface value. Callable by any component (Builder, OIL, CC, SYSTEM).
 * @param {import('pg').Pool} pool
 * @param {string} surfaceName
 * @returns {Promise<{surface_name:string, value_json:object, updated_at:Date, is_stale:boolean, ttl_minutes:number}>}
 */
export async function readTruthSurface(pool, surfaceName) {
  if (!VALID_SURFACES.has(surfaceName)) {
    throw new Error(`Unknown truth surface: "${surfaceName}". Valid: ${[...VALID_SURFACES].join(', ')}`);
  }
  const { rows } = await pool.query(
    // is_stale is computed at query time — NOT from a stored column (OIL-B1 fix 2026-05-20)
    `SELECT surface_name, value_json, written_by, updated_at, ttl_minutes, heartbeat_minutes,
            NOW() > updated_at + (ttl_minutes || ' minutes')::INTERVAL AS is_stale
     FROM builder_truth_surfaces
     WHERE surface_name = $1`,
    [surfaceName]
  );
  if (rows.length === 0) throw new Error(`Truth surface "${surfaceName}" not found — was migration applied?`);
  return rows[0];
}

/**
 * Read all truth surfaces. Callable by any component.
 * @param {import('pg').Pool} pool
 * @returns {Promise<Array>}
 */
export async function readAllTruthSurfaces(pool) {
  const { rows } = await pool.query(
    // is_stale computed at query time — runtime expression, not stored column (OIL-B1 fix)
    `SELECT surface_name, value_json, written_by, updated_at, ttl_minutes, heartbeat_minutes,
            NOW() > updated_at + (ttl_minutes || ' minutes')::INTERVAL AS is_stale
     FROM builder_truth_surfaces
     ORDER BY surface_name`
  );
  return rows;
}

/**
 * Write a truth surface. OIL-only — any other caller receives TRUTH_SURFACE_VIOLATION halt.
 *
 * @param {import('pg').Pool} pool
 * @param {string} surfaceName
 * @param {object} valueJson   — arbitrary truth data (deploy status, migration state, etc.)
 * @param {string} caller      — MUST be 'OIL'. Anything else raises the halt.
 * @throws {Error} TRUTH_SURFACE_VIOLATION if caller !== 'OIL'
 */
export async function writeTruthSurface(pool, surfaceName, valueJson, caller) {
  if (caller !== 'OIL') {
    const violation = {
      halt_code: TRUTH_SURFACE_VIOLATION,
      caller,
      surface: surfaceName,
      message: `Write to builder_truth_surfaces rejected: caller="${caller}" is not OIL. ` +
               `Only OIL audit routes may write runtime truth surfaces. ` +
               `Log this as a TRUTH_SURFACE_VIOLATION halt and notify Adam.`,
    };
    const err = new Error(violation.message);
    err.halt_code = TRUTH_SURFACE_VIOLATION;
    err.halt_context = violation;
    throw err;
  }

  if (!VALID_SURFACES.has(surfaceName)) {
    throw new Error(`Unknown truth surface: "${surfaceName}". Valid: ${[...VALID_SURFACES].join(', ')}`);
  }

  await pool.query(
    `UPDATE builder_truth_surfaces
     SET value_json = $1, updated_at = NOW()
     WHERE surface_name = $2`,
    [JSON.stringify(valueJson), surfaceName]
  );
}

/**
 * Check whether any truth surface is stale. Returns list of stale surface names.
 * Builder dispatch may use this to halt before starting work (Slice 2+).
 * @param {import('pg').Pool} pool
 * @returns {Promise<string[]>} stale surface names (empty = all fresh)
 */
export async function getStaleSurfaces(pool) {
  // OIL-B2 fix (2026-05-20): was querying stored is_stale column (always false).
  // Now evaluates staleness at query time against current NOW().
  const { rows } = await pool.query(
    `SELECT surface_name FROM builder_truth_surfaces
     WHERE NOW() > updated_at + (ttl_minutes || ' minutes')::INTERVAL`
  );
  return rows.map(r => r.surface_name);
}

/**
 * Acquire the serial execution lock (AUTONOMY_WRITE_LOCK).
 * Tier 0: only 1 active task allowed. Expired locks (expires_at < NOW()) are ignored.
 *
 * @param {import('pg').Pool} pool
 * @param {number} segmentId
 * @param {string} projectSlug
 * @param {number} autonomyTier — 0=serial(1), 1=2-concurrent, 2+=queue-max
 * @returns {Promise<{acquired:boolean, activeTaskId:number|null, blockedBy:object|null}>}
 */
export async function acquireSerialLock(pool, segmentId, projectSlug, autonomyTier = 0) {
  const maxConcurrent = autonomyTier === 0 ? 1 : (autonomyTier === 1 ? 2 : 99);

  // Count non-expired active locks
  const { rows: active } = await pool.query(
    `SELECT id, segment_id, acquired_at, expires_at
     FROM builder_active_tasks
     WHERE status = 'active' AND expires_at > NOW()
     ORDER BY acquired_at ASC`,
  );

  if (active.length >= maxConcurrent) {
    return { acquired: false, activeTaskId: null, blockedBy: active[0] };
  }

  const { rows: inserted } = await pool.query(
    `INSERT INTO builder_active_tasks (segment_id, project_slug, status, autonomy_tier, expires_at)
     VALUES ($1, $2, 'active', $3, NOW() + INTERVAL '30 minutes')
     RETURNING id`,
    [segmentId, projectSlug, autonomyTier]
  );
  return { acquired: true, activeTaskId: inserted[0].id, blockedBy: null };
}

/**
 * Release the serial execution lock for a task.
 * @param {import('pg').Pool} pool
 * @param {number} activeTaskId — the id returned by acquireSerialLock
 * @param {'complete'|'error'|'expired'} releaseStatus
 */
export async function releaseSerialLock(pool, activeTaskId, releaseStatus = 'complete') {
  await pool.query(
    `UPDATE builder_active_tasks
     SET status = $1, released_at = NOW()
     WHERE id = $2`,
    [releaseStatus, activeTaskId]
  );
}

/**
 * Write a task receipt. Called by builder-supervisor at task completion.
 * This is the Builder's own record — the OIL audit receipt is separate (builder_audit_receipts).
 *
 * @param {import('pg').Pool} pool
 * @param {object} receipt
 */
export async function writeTaskReceipt(pool, receipt) {
  const {
    segmentId,
    projectSlug,
    activeTaskId,
    status,
    startedAt,
    completedAt,
    elapsedMinutes,
    councilVerdict,
    councilGuidance,
    allowedFiles,
    filesWritten,
    scopeViolation,
    haltCode,
    haltContext,
    tokensUsed,
    tokenBudget,
    prUrl,
    commitSha,
    stdoutExcerpt,
    buildSessionId,
    auditorSessionId,
  } = receipt;

  const { rows } = await pool.query(
    `INSERT INTO builder_task_receipts (
       segment_id, project_slug, active_task_id, status,
       started_at, completed_at, elapsed_minutes,
       council_verdict, council_guidance,
       allowed_files, files_written, scope_violation,
       halt_code, halt_context,
       tokens_used, token_budget,
       pr_url, commit_sha, stdout_excerpt,
       build_session_id, auditor_session_id
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
     ) RETURNING id`,
    [
      segmentId ?? null,
      projectSlug,
      activeTaskId ?? null,
      status,
      startedAt,
      completedAt ?? null,
      elapsedMinutes ?? null,
      councilVerdict ?? null,
      councilGuidance ?? null,
      allowedFiles ?? null,
      filesWritten ?? null,
      scopeViolation ?? false,
      haltCode ?? null,
      haltContext ? JSON.stringify(haltContext) : null,
      tokensUsed ?? null,
      tokenBudget ?? null,
      prUrl ?? null,
      commitSha ?? null,
      stdoutExcerpt ? stdoutExcerpt.slice(0, 10000) : null,
      buildSessionId ?? null,
      auditorSessionId ?? null,
    ]
  );
  const receiptId = rows[0].id;
  try {
    mirrorReceiptToFile('task', receiptId, { ...receipt, receipt_id: receiptId });
  } catch {
    /* file mirror is best-effort; DB row is authoritative */
  }
  return receiptId;
}

/**
 * Write a halt log entry.
 * @param {import('pg').Pool} pool
 * @param {object} halt
 */
export async function writeHaltLog(pool, halt) {
  const { haltCode, segmentId, projectSlug, contextJson, escalationTier } = halt;
  await pool.query(
    `INSERT INTO builder_halt_log (halt_code, segment_id, project_slug, context_json, escalation_tier)
     VALUES ($1, $2, $3, $4, $5)`,
    [haltCode, segmentId ?? null, projectSlug ?? null, contextJson ? JSON.stringify(contextJson) : null, escalationTier ?? null]
  );
}

/**
 * Write a structured failure log entry (Slice 1 foundation; taxonomy enforced in Slice 8).
 * @param {import('pg').Pool} pool
 * @param {object} failure
 */
export async function writeFailureLog(pool, failure) {
  const {
    taskReceiptId,
    segmentId,
    projectSlug,
    failureFamily,
    failureDetail,
    contextJson,
    retryEligible = false,
    retryCount = 0,
  } = failure;
  await pool.query(
    `INSERT INTO builder_failure_log (
       task_receipt_id, segment_id, project_slug, failure_family,
       failure_detail, context_json, retry_eligible, retry_count
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      taskReceiptId ?? null,
      segmentId ?? null,
      projectSlug ?? null,
      failureFamily,
      failureDetail ?? null,
      contextJson ? JSON.stringify(contextJson) : null,
      retryEligible,
      retryCount,
    ]
  );
}

/**
 * Normalize segment row → Tier 0 task DNA for dispatch gate checks.
 * @param {object} segment — project_segments row
 */
export function normalizeTier0TaskDna(segment) {
  const rawDna = segment.task_dna;
  const dna = rawDna && typeof rawDna === 'object'
    ? rawDna
    : (typeof rawDna === 'string' ? (() => { try { return JSON.parse(rawDna); } catch { return {}; } })() : {});

  const allowedFiles = Array.isArray(segment.allowed_files)
    ? segment.allowed_files
    : (segment.allowed_files ? JSON.parse(segment.allowed_files) : null);

  return {
    allowed_files: allowedFiles,
    exact_outcome: segment.exact_outcome?.trim?.() ? segment.exact_outcome.trim() : segment.exact_outcome,
    rollback_path: (segment.rollback_path || segment.rollback_note || '').toString().trim() || null,
    telemetry_required: dna.telemetry_required,
    cache_status_required: dna.cache_status_required,
    truncation_detection_required: dna.truncation_detection_required,
    lower_model_decision_authority: dna.lower_model_decision_authority,
  };
}

/**
 * Tier 0 dispatch gate — missing field → PENDING (not executed).
 * @returns {{ pass: boolean, haltCode?: string, missingField?: string, dna?: object }}
 */
export function checkTier0DispatchGate(segment) {
  const dna = normalizeTier0TaskDna(segment);

  if (!dna.allowed_files || dna.allowed_files.length === 0) {
    return { pass: false, haltCode: 'DISPATCH_GATE_FAIL: allowed_files_missing', missingField: 'allowed_files', dna };
  }
  if (!dna.exact_outcome) {
    return { pass: false, haltCode: 'DISPATCH_GATE_FAIL: exact_outcome_missing', missingField: 'exact_outcome', dna };
  }
  if (!dna.rollback_path) {
    return { pass: false, haltCode: 'DISPATCH_GATE_FAIL: rollback_path_missing', missingField: 'rollback_path', dna };
  }
  if (dna.telemetry_required !== true) {
    return { pass: false, haltCode: 'DISPATCH_GATE_FAIL: telemetry_required_false', missingField: 'telemetry_required', dna };
  }
  if (dna.cache_status_required !== true) {
    return { pass: false, haltCode: 'DISPATCH_GATE_FAIL: cache_status_required_false', missingField: 'cache_status_required', dna };
  }
  if (dna.truncation_detection_required !== true) {
    return { pass: false, haltCode: 'DISPATCH_GATE_FAIL: truncation_detection_required_false', missingField: 'truncation_detection_required', dna };
  }
  if (dna.lower_model_decision_authority !== false) {
    return { pass: false, haltCode: 'DISPATCH_GATE_FAIL: decision_authority_leak', missingField: 'lower_model_decision_authority', dna };
  }

  return { pass: true, dna };
}

/**
 * Fail closed if trust-spine tables are missing (migration not applied).
 * @param {import('pg').Pool} pool
 */
export async function assertTrustSpineReady(pool) {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [TRUST_SPINE_TABLES]
  );
  const found = new Set(rows.map(r => r.table_name));
  const missing = TRUST_SPINE_TABLES.filter(t => !found.has(t));
  if (missing.length > 0) {
    const err = new Error(
      `Builder trust spine not ready — missing tables: ${missing.join(', ')}. ` +
      'Apply db/migrations/20260519_builder_trust_spine.sql before running the supervisor.'
    );
    err.halt_code = 'TRUST_SPINE_NOT_READY';
    err.halt_context = { missing };
    throw err;
  }
}

/**
 * Mirror a receipt JSON to data/builder/receipts/ (FD05 file mirror; non-authoritative).
 */
export function mirrorReceiptToFile(receiptType, receiptId, payload) {
  const root = path.join(process.cwd(), 'data', 'builder', 'receipts');
  fs.mkdirSync(root, { recursive: true });
  const filePath = path.join(root, `${receiptType}-${receiptId}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ ...payload, mirrored_at: new Date().toISOString() }, null, 2));
  return filePath;
}
