/**
 * SYNOPSIS: @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

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
