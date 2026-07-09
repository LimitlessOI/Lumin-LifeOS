/**
 * SYNOPSIS: @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// @ssot docs/products/builderos/PRODUCT_HOME.md

import { isFounderBuildProofPending } from './founder-build-job-store.js';
import { hydrateFounderBuildResultTruth } from './founder-build-result-truth.js';

const MIN_INSTRUCTION_LENGTH = 12;
const DANGEROUS_PATTERNS = [
  'DROP TABLE',
  'DELETE DATABASE',
  'EXPOSE SECRET',
  'ROTATE PROD SECRET',
  'IRREVERSIBLE_LAUNCH',
];

function normalizeText(value) {
  return String(value || '').trim();
}

function isDangerousInstruction(instruction) {
  const upper = instruction.toUpperCase();
  return DANGEROUS_PATTERNS.some((pattern) => upper.includes(pattern));
}

function normalizeMetadata(metadata) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
}

export async function getCommandControlHaltState(pool) {
  const result = await pool.query(
    `SELECT active, reason, updated_at
       FROM builderos_command_control_state
      WHERE key = 'global_halt'
      LIMIT 1`
  );
  if (!result.rows[0]) return { active: false, reason: null, updated_at: null };
  return result.rows[0];
}

export async function setCommandControlHalt(pool, payload = {}) {
  const active = payload.active === true;
  const reason = active ? normalizeText(payload.reason) || 'Manual halt' : null;
  const triggeredBy = normalizeText(payload.triggered_by) || 'adam_remote';
  const result = await pool.query(
    `INSERT INTO builderos_command_control_state (key, active, reason, triggered_by)
     VALUES ('global_halt', $1, $2, $3)
     ON CONFLICT (key)
     DO UPDATE SET active = EXCLUDED.active,
                   reason = EXCLUDED.reason,
                   triggered_by = EXCLUDED.triggered_by,
                   updated_at = NOW()
     RETURNING key, active, reason, triggered_by, updated_at`,
    [active, reason, triggeredBy]
  );
  return result.rows[0];
}

export async function createCommandControlJob(pool, input = {}) {
  const instruction = normalizeText(input.instruction);
  const requestedBy = normalizeText(input.requested_by) || 'adam_remote';
  const metadata = normalizeMetadata(input.metadata_json || input.metadata);
  const halt = await getCommandControlHaltState(pool);

  let status = 'queued';
  let blocker = null;
  if (halt.active) {
    status = 'halted';
    blocker = 'GLOBAL_HALT';
  } else if (instruction.length < MIN_INSTRUCTION_LENGTH) {
    status = 'blocked';
    blocker = 'INSUFFICIENT_INSTRUCTION';
  } else if (isDangerousInstruction(instruction)) {
    status = 'blocked';
    blocker = 'OUTSIDE_PB_BOUNDARY';
  }

  const result = await pool.query(
    `INSERT INTO builderos_command_control_jobs
       (instruction, requested_by, status, blocker, metadata_json, result_json, receipts_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, instruction, requested_by, status, blocker, metadata_json, result_json, receipts_json, created_at, updated_at`,
    [
      instruction,
      requestedBy,
      status,
      blocker,
      metadata,
      { accepted: status === 'queued', halted: status === 'halted' },
      [],
    ]
  );
  return result.rows[0];
}

export async function getCommandControlJob(pool, jobId) {
  const result = await pool.query(
    `SELECT id, instruction, requested_by, status, blocker, metadata_json, result_json, receipts_json,
            created_at, updated_at, cancelled_at
       FROM builderos_command_control_jobs
      WHERE id = $1
      LIMIT 1`,
    [jobId]
  );
  return result.rows[0] || null;
}

export async function listCommandControlJobs(pool, { limit = 20, status = '' } = {}) {
  const capped = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const params = [];
  const clauses = [];
  let idx = 1;

  if (String(status || '').trim()) {
    clauses.push(`status = $${idx}`);
    params.push(String(status).trim());
    idx += 1;
  }

  params.push(capped);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT id, instruction, requested_by, status, blocker, metadata_json, result_json, receipts_json,
            created_at, updated_at, cancelled_at
       FROM builderos_command_control_jobs
      ${where}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $${idx}`,
    params
  );
  return result.rows;
}

export async function cancelCommandControlJob(pool, jobId, payload = {}) {
  const cancelledBy = normalizeText(payload.cancelled_by) || 'adam_remote';
  const result = await pool.query(
    `UPDATE builderos_command_control_jobs
        SET status = 'cancelled',
            blocker = COALESCE(blocker, 'CANCELLED_BY_OPERATOR'),
            result_json = COALESCE(result_json, '{}'::jsonb) || jsonb_build_object('cancelled_by', $2::text),
            cancelled_at = NOW(),
            updated_at = NOW()
      WHERE id = $1::uuid
        AND status IN ('queued', 'running')
    RETURNING id, status, blocker, cancelled_at, updated_at, result_json`,
    [jobId, cancelledBy]
  );
  return result.rows[0] || null;
}

export async function updateCommandControlJobExecution(pool, jobId, patch = {}) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (patch.status) {
    fields.push(`status = $${idx++}`);
    values.push(patch.status);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'blocker')) {
    fields.push(`blocker = $${idx++}`);
    values.push(patch.blocker);
  }
  if (patch.result_json && typeof patch.result_json === 'object') {
    fields.push(`result_json = COALESCE(result_json, '{}'::jsonb) || $${idx++}::jsonb`);
    values.push(JSON.stringify(patch.result_json));
  }

  if (patch.receipt && typeof patch.receipt === 'object') {
    fields.push(`receipts_json = COALESCE(receipts_json, '[]'::jsonb) || $${idx++}::jsonb`);
    values.push(JSON.stringify([{ ...patch.receipt, at: patch.receipt.at || new Date().toISOString() }]));
  }

  if (!fields.length) return null;

  fields.push('updated_at = NOW()');
  values.push(jobId);

  const result = await pool.query(
    `UPDATE builderos_command_control_jobs
        SET ${fields.join(', ')}
      WHERE id = $${idx}::uuid
    RETURNING id, status, blocker, metadata_json, result_json, receipts_json, updated_at`,
    values
  );
  return result.rows[0] || null;
}

const FOUNDER_INTERFACE_JOB_KIND = 'founder_interface_build';

/** Durable job row for async founder builds — survives Railway multi-instance poll. */
export async function createFounderInterfaceBuildJobRecord(pool, { id, instruction, userId = null } = {}) {
  if (!pool || !id) return null;
  const result = await pool.query(
    `INSERT INTO builderos_command_control_jobs
       (id, instruction, requested_by, status, metadata_json, result_json, receipts_json)
     VALUES ($1::uuid, $2, 'founder_interface_async', 'running', $3::jsonb, $4::jsonb, '[]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       status = 'running',
       updated_at = NOW()
     RETURNING id, status, instruction, metadata_json, result_json`,
    [
      id,
      String(instruction || '').trim(),
      JSON.stringify({ kind: FOUNDER_INTERFACE_JOB_KIND, user_id: userId }),
      JSON.stringify({ pass_fail: 'RUNNING', async: true }),
    ],
  );
  await pool.query(
    `INSERT INTO build_task_ledger (
       task_id, blueprint_id, product_lane, source, status, start_time,
       files_planned, model_used, agent_used, human_intervention, proof_required, metadata
     )
     SELECT $1, NULL, 'lifeos', 'founder_interface_build', 'running', NOW(),
            NULL, NULL, 'founder_interface_async', FALSE, $2::jsonb, $3::jsonb
     WHERE NOT EXISTS (
       SELECT 1 FROM build_task_ledger WHERE task_id = $1 AND status = 'running'
     )`,
    [
      id,
      JSON.stringify(['build', 'deploy', 'founder_live']),
      JSON.stringify({ kind: FOUNDER_INTERFACE_JOB_KIND, user_id: userId }),
    ],
  ).catch(() => null);
  return result.rows[0] || null;
}

export function mapDbRowToFounderBuildJob(row) {
  if (!row || row.metadata_json?.kind !== FOUNDER_INTERFACE_JOB_KIND) return null;
  const founderResult = hydrateFounderBuildResultTruth(
    row.result_json?.founder_result || row.result_json || {},
    row.instruction,
  );
  const running = row.status === 'running' || row.status === 'queued' || row.status === 'retrying';
  if (running) {
    return {
      id: row.id,
      task: row.instruction,
      status: 'running',
      result: null,
      created_at: row.created_at,
    };
  }
  const pass = founderResult.pass_fail === 'PASS';
  const waitingForProof = pass && (
    row.status === 'committed'
    || isFounderBuildProofPending(founderResult)
  );
  return {
    id: row.id,
    task: row.instruction,
    status: waitingForProof ? 'waiting_for_proof' : pass ? 'completed' : 'failed',
    created_at: row.created_at,
    result: {
      ...founderResult,
      pass_fail: founderResult.pass_fail || (pass ? 'PASS' : 'FAIL'),
      first_blocker: founderResult.first_blocker || row.blocker || null,
      persistence_status: row.status,
    },
  };
}

export async function loadFounderBuildJobFromDb(pool, jobId) {
  const row = await getCommandControlJob(pool, jobId);
  return mapDbRowToFounderBuildJob(row);
}

export async function persistFounderBuildJobResult(pool, jobId, result = {}) {
  if (!pool || !jobId) return null;
  const normalized = hydrateFounderBuildResultTruth(result);
  const pass = normalized.pass_fail === 'PASS';
  const status = pass
    ? (isFounderBuildProofPending(normalized) ? 'committed' : 'completed')
    : 'failed';
  const proofStatus = pass
    ? (isFounderBuildProofPending(normalized) ? 'partial' : 'complete')
    : 'partial';
  const founderVerification = normalized.founder_verification || null;
  const metadata = {
    kind: FOUNDER_INTERFACE_JOB_KIND,
    execution_path: normalized.execution_path || null,
    transport_status: normalized.transport_status || null,
    founder_verification,
  };
  await pool.query(
    `UPDATE build_task_ledger SET
       status = CASE
         WHEN $2 = 'completed' THEN 'done'
         WHEN $2 = 'failed' THEN 'failed'
         ELSE 'running'
       END,
       end_time = CASE WHEN $2 IN ('completed','failed') THEN NOW() ELSE end_time END,
       files_changed = COALESCE($3::text[], files_changed),
       deploy_status = COALESCE($4, deploy_status),
       proof_status = $5,
       metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb,
       updated_at = NOW()
     WHERE task_id = $1`,
    [
      jobId,
      status,
      normalized.target_file ? [normalized.target_file] : null,
      normalized.transport_status || null,
      proofStatus,
      JSON.stringify(metadata),
    ],
  ).catch(() => null);
  return updateCommandControlJobExecution(pool, jobId, {
    status,
    blocker: normalized.first_blocker || normalized.blocker || null,
    result_json: {
      founder_result: normalized,
      pass_fail: normalized.pass_fail,
      committed: normalized.committed === true,
      target_file: normalized.target_file || null,
      sha: normalized.sha || null,
    },
  });
}

/** Compact receipt Chair can cite on the next turn (recall — not a new command). */
export function summarizeFounderBuildReceipt(job) {
  if (!job?.result) return null;
  const r = job.result;
  const sha = r.sha || r.commit_sha || null;
  const committed = r.committed === true || (r.pass_fail === 'PASS' && Boolean(sha));
  const rawAt = job.updated_at || job.created_at || null;
  const updatedAt = typeof rawAt === 'number' && Number.isFinite(rawAt)
    ? new Date(rawAt).toISOString()
    : (rawAt || null);
  return {
    job_id: job.id || null,
    pass_fail: r.pass_fail || null,
    committed,
    commit_sha: sha,
    target_file: r.target_file || null,
    transport_status: r.transport_status || null,
    first_blocker: r.first_blocker || null,
    task_preview: String(job.task || '').slice(0, 220) || null,
    updated_at: updatedAt,
  };
}

/**
 * Latest founder-interface build job for Chair recall (DB).
 * Prefer user-scoped rows; fall back to any recent founder_interface_build.
 */
export async function getLatestFounderInterfaceBuildReceipt(pool, { userId = null } = {}) {
  if (!pool) return null;
  try {
    let row = null;
    if (userId != null && userId !== '') {
      const scoped = await pool.query(
        `SELECT id, instruction, requested_by, status, blocker, metadata_json, result_json, receipts_json,
                created_at, updated_at, cancelled_at
           FROM builderos_command_control_jobs
          WHERE metadata_json->>'kind' = $1
            AND (
              metadata_json->>'user_id' = $2
              OR metadata_json->>'user_id' = $3
            )
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 1`,
        [FOUNDER_INTERFACE_JOB_KIND, String(userId), String(Number(userId))],
      );
      row = scoped.rows[0] || null;
    }
    if (!row) {
      const any = await pool.query(
        `SELECT id, instruction, requested_by, status, blocker, metadata_json, result_json, receipts_json,
                created_at, updated_at, cancelled_at
           FROM builderos_command_control_jobs
          WHERE metadata_json->>'kind' = $1
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 1`,
        [FOUNDER_INTERFACE_JOB_KIND],
      );
      row = any.rows[0] || null;
    }
    const job = mapDbRowToFounderBuildJob(row);
    return summarizeFounderBuildReceipt(job);
  } catch {
    return null;
  }
}
