/**
 * SYNOPSIS: BuilderOS TSOS internal hook — emits tsos_internal_hook telemetry row
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * after a governed loop job commits. Proof source for tsos_internal_hooks
 * maturity scoring (TSOS_HOOK_BOUNDARY.md). Only emits on actual commit.
 */

const TSOS_HOOK_TASK_TYPE = 'tsos_internal_hook';
const TSOS_HOOK_TASK_GOAL = 'builderos_governed_loop_commit';
const TSOS_METADATA_VERSION = 'tsos-g2';

const REQUIRED_METADATA_KEYS = [
  'verifier_ok',
  'committed',
  'run_id',
  'job_id',
  'target_file',
  'job_type',
  'duration_ms',
  'output_bytes',
];

function pickOptionalString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function pickOptionalBool(value) {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function pickOptionalInt(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Fail-open metadata builder for TSOS-G2 hook rows.
 * @param {object} data
 * @returns {Record<string, unknown>}
 */
export function buildTsosHookMetadata(data = {}) {
  const jobId = pickOptionalString(data.jobId || data.runId);
  const runId = pickOptionalString(data.runId || data.jobId) || jobId;
  const metadata = {
    metadata_version: TSOS_METADATA_VERSION,
    verifier_ok: pickOptionalBool(data.verifierOk),
    committed: pickOptionalBool(data.committed),
    run_id: runId,
    job_id: jobId,
    target_file: pickOptionalString(data.targetFile),
    job_type: pickOptionalString(data.jobType) || 'governed_loop_c2',
    duration_ms: pickOptionalInt(data.durationMs),
    output_bytes: pickOptionalInt(data.outputBytes),
    builder_model: pickOptionalString(data.builderModel || data.modelUsed),
    repair_count: pickOptionalInt(data.repairCount ?? data.repairAttempts),
    repair_attempts: pickOptionalInt(data.repairAttempts ?? data.repairCount),
    total_token_estimate: pickOptionalInt(data.totalTokenEstimate),
    verifier_receipt_id: pickOptionalString(data.verifierReceiptId),
    governance_receipt_id: pickOptionalString(data.governanceReceiptId),
  };

  for (const key of Object.keys(metadata)) {
    if (metadata[key] === null || metadata[key] === undefined) {
      delete metadata[key];
    }
  }
  return metadata;
}

/**
 * Build emit payload from governed loop commit context (fail-open).
 */
export function buildTsosHookPayloadFromGovernedCommit({
  jobId,
  job,
  plan,
  builderResult,
  verifierResult,
  repairAttempts = 0,
}) {
  const targetFile =
    builderResult?.target_file ||
    plan?.target_file ||
    job?.metadata_json?.target_file ||
    null;
  const repairCount = pickOptionalInt(repairAttempts) ?? 0;
  const rawTokens =
    builderResult?.raw?.usage?.total_tokens ??
    builderResult?.raw?.total_tokens ??
    builderResult?.raw?.token_estimate ??
    null;

  return {
    jobId,
    runId: jobId,
    jobType: 'governed_loop_c2',
    targetFile,
    verifierOk: verifierResult?.ok === true,
    committed: true,
    modelUsed: builderResult?.model_used || null,
    builderModel: builderResult?.model_used || null,
    outputBytes: builderResult?.output ? builderResult.output.length : 0,
    repairAttempts: repairCount,
    repairCount,
    durationMs: job?.created_at ? Date.now() - new Date(job.created_at).getTime() : null,
    totalTokenEstimate: pickOptionalInt(rawTokens),
    verifierReceiptId: `${jobId}:oil_verifier:attempt-${repairCount}`,
    governanceReceiptId: `${jobId}:oil_boundary_audit`,
  };
}

async function hookRunIdExists(pool, runId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM autonomous_telemetry_events
     WHERE task_type = $1 AND run_id = $2
     LIMIT 1`,
    [TSOS_HOOK_TASK_TYPE, runId]
  );
  return rows.length > 0;
}

/**
 * Emit a TSOS hook reading row after a governed loop job commits.
 * Skips duplicate run_id rows. Fail-open — never throws to caller.
 */
export async function emitTSOSHookReading(pool, data = {}) {
  const runId = pickOptionalString(data.runId || data.jobId);
  if (!pool || !runId) {
    return { ok: false, error: 'missing_pool_or_run_id' };
  }

  try {
    if (await hookRunIdExists(pool, runId)) {
      return { ok: true, skipped: true, reason: 'duplicate_run_id', run_id: runId };
    }

    const metadata = buildTsosHookMetadata(data);
    const modelUsed = pickOptionalString(data.modelUsed || data.builderModel);
    const tokenEstimate = pickOptionalInt(data.totalTokenEstimate ?? metadata.total_token_estimate) ?? 0;

    const { rows } = await pool.query(
      `INSERT INTO autonomous_telemetry_events
         (run_id, task_type, model_used, total_token_estimate, task_goal, metadata, repair_attempts, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        runId,
        TSOS_HOOK_TASK_TYPE,
        modelUsed,
        tokenEstimate,
        TSOS_HOOK_TASK_GOAL,
        JSON.stringify(metadata),
        pickOptionalInt(data.repairAttempts ?? data.repairCount) ?? 0,
        metadata.verifier_ok === true && metadata.committed === true,
      ]
    );
    return { ok: true, row_id: rows[0].id, run_id: runId, metadata };
  } catch (error) {
    console.error('[TSOS-HOOK] emit failed:', error.message);
    return { ok: false, error: error.message, run_id: runId };
  }
}

/** Returns count of tsos_internal_hook events — used by alpha readiness scoring. */
export async function getTSOSHookCount(pool) {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) FROM autonomous_telemetry_events WHERE task_type = 'tsos_internal_hook'"
    );
    return { ok: true, count: parseInt(rows[0].count, 10) };
  } catch (error) {
    return { ok: false, count: 0, error: error.message };
  }
}

export { REQUIRED_METADATA_KEYS, TSOS_HOOK_TASK_TYPE, TSOS_METADATA_VERSION };
