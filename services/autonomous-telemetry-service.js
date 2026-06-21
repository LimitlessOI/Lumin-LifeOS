/**
 * SYNOPSIS: Autonomous telemetry — durable Neon storage for PB-governed autonomous work.
 * Autonomous telemetry — durable Neon storage for PB-governed autonomous work.
 * Honest token estimates only. No secrets. No prompt contents.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import { randomUUID } from 'node:crypto';
import { normalizeSha } from './oil-self-repair-detector.js';

export const TOKEN_ESTIMATE_METHOD = Object.freeze({
  EXACT: 'exact_usage',
  CHARS_DIV_4: 'chars_div_4_estimate',
  NONE: 'not_available',
});

/** ~4 chars per token — labeled estimate, not billing truth. */
export function estimateTokensFromChars(charCount = 0, { label = TOKEN_ESTIMATE_METHOD.CHARS_DIV_4 } = {}) {
  const n = Math.max(0, Number(charCount) || 0);
  if (!n) return { input: 0, output: 0, total: 0, method: TOKEN_ESTIMATE_METHOD.NONE };
  const est = Math.ceil(n / 4);
  return { input: 0, output: est, total: est, method: label };
}

export function newRunId(prefix = 'run') {
  return `${prefix}-${randomUUID()}`;
}

export function newSessionId() {
  return `session-${randomUUID()}`;
}

function asJsonArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function clampScore(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.max(0, Math.min(1, Math.round(Number(value) * 1000) / 1000));
}

/**
 * Insert one telemetry row — best-effort; never throws to callers.
 */
export async function emitAutonomousTelemetry(pool, event = {}) {
  if (!pool?.query) {
    return { written: false, reason: 'no_pool' };
  }

  const inputEst = event.token_input_estimate ?? null;
  const outputEst = event.token_output_estimate ?? null;
  const totalEst =
    event.total_token_estimate ??
    (inputEst != null || outputEst != null ? (Number(inputEst) || 0) + (Number(outputEst) || 0) : null);

  const payload = {
    run_id: event.run_id || newRunId(event.task_type || 'task'),
    cycle_id: event.cycle_id || null,
    session_id: event.session_id || null,
    task_type: event.task_type || 'unknown',
    task_goal: event.task_goal ? String(event.task_goal).slice(0, 500) : null,
    model_used: event.model_used || null,
    token_input_estimate: inputEst,
    token_output_estimate: outputEst,
    total_token_estimate: totalEst,
    token_estimate_method: event.token_estimate_method || TOKEN_ESTIMATE_METHOD.NONE,
    wall_clock_ms: event.wall_clock_ms ?? null,
    decision_latency_ms: event.decision_latency_ms ?? null,
    build_latency_ms: event.build_latency_ms ?? null,
    verification_latency_ms: event.verification_latency_ms ?? null,
    repair_latency_ms: event.repair_latency_ms ?? null,
    retries: Number(event.retries) || 0,
    repair_attempts: Number(event.repair_attempts) || 0,
    proof_status_before: event.proof_status_before || null,
    proof_status_after: event.proof_status_after || null,
    audit_result: event.audit_result || null,
    pb_boundary: event.pb_boundary || 'SYSTEM_AUTHORIZED_UNDER_PB',
    stopped_reason: event.stopped_reason ? String(event.stopped_reason).slice(0, 500) : null,
    useful_work_score: clampScore(event.useful_work_score),
    useful_work_method: event.useful_work_method || null,
    hallucination_detected: event.hallucination_detected === true,
    drift_detected: event.drift_detected === true,
    files_changed: JSON.stringify(asJsonArray(event.files_changed)),
    commits_created: Number(event.commits_created) || 0,
    receipts_created: JSON.stringify(asJsonArray(event.receipts_created)),
    deploy_sha: normalizeSha(event.deploy_sha) || event.deploy_sha || null,
    success: event.success === true,
    metadata: JSON.stringify(event.metadata && typeof event.metadata === 'object' ? event.metadata : {}),
  };

  try {
    const { rows } = await pool.query(
      `INSERT INTO autonomous_telemetry_events (
         run_id, cycle_id, session_id, task_type, task_goal, model_used,
         token_input_estimate, token_output_estimate, total_token_estimate, token_estimate_method,
         wall_clock_ms, decision_latency_ms, build_latency_ms, verification_latency_ms, repair_latency_ms,
         retries, repair_attempts, proof_status_before, proof_status_after, audit_result,
         pb_boundary, stopped_reason, useful_work_score, useful_work_method,
         hallucination_detected, drift_detected, files_changed, commits_created, receipts_created,
         deploy_sha, success, metadata
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32::jsonb
       ) RETURNING id, created_at`,
      [
        payload.run_id,
        payload.cycle_id,
        payload.session_id,
        payload.task_type,
        payload.task_goal,
        payload.model_used,
        payload.token_input_estimate,
        payload.token_output_estimate,
        payload.total_token_estimate,
        payload.token_estimate_method,
        payload.wall_clock_ms,
        payload.decision_latency_ms,
        payload.build_latency_ms,
        payload.verification_latency_ms,
        payload.repair_latency_ms,
        payload.retries,
        payload.repair_attempts,
        payload.proof_status_before,
        payload.proof_status_after,
        payload.audit_result,
        payload.pb_boundary,
        payload.stopped_reason,
        payload.useful_work_score,
        payload.useful_work_method,
        payload.hallucination_detected,
        payload.drift_detected,
        payload.files_changed,
        payload.commits_created,
        payload.receipts_created,
        payload.deploy_sha,
        payload.success,
        payload.metadata,
      ]
    );
    return { written: true, id: rows[0]?.id, run_id: payload.run_id, created_at: rows[0]?.created_at };
  } catch (err) {
    return { written: false, reason: err.message?.slice(0, 200) || 'insert_failed' };
  }
}

export async function listAutonomousTelemetry(pool, { sessionId, limit = 50, sinceHours = 168 } = {}) {
  if (!pool?.query) return { ok: false, events: [], count: 0 };
  const params = [];
  const clauses = [`created_at >= NOW() - ($${params.length + 1} || ' hours')::interval`];
  params.push(String(sinceHours));

  if (sessionId) {
    params.push(sessionId);
    clauses.push(`session_id = $${params.length}`);
  }

  params.push(Math.min(limit, 200));
  const { rows } = await pool.query(
    `SELECT * FROM autonomous_telemetry_events
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return { ok: true, events: rows, count: rows.length };
}

export async function getSessionTelemetrySummary(pool, sessionId) {
  if (!pool?.query || !sessionId) return { ok: false, session_id: sessionId };
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS event_count,
       COUNT(DISTINCT cycle_id)::int AS cycles,
       SUM(COALESCE(total_token_estimate, 0))::bigint AS total_token_estimate,
       SUM(COALESCE(wall_clock_ms, 0))::bigint AS total_wall_ms,
       AVG(COALESCE(wall_clock_ms, 0))::int AS avg_wall_ms,
       SUM(CASE WHEN success THEN 1 ELSE 0 END)::int AS success_count,
       SUM(CASE WHEN NOT success THEN 1 ELSE 0 END)::int AS failure_count,
       SUM(COALESCE(retries, 0))::int AS total_retries,
       SUM(COALESCE(repair_attempts, 0))::int AS total_repair_attempts,
       AVG(useful_work_score) FILTER (WHERE useful_work_score IS NOT NULL) AS avg_useful_work_score
     FROM autonomous_telemetry_events
     WHERE session_id = $1`,
    [sessionId]
  );
  const row = rows[0] || {};
  return {
    ok: true,
    session_id: sessionId,
    event_count: row.event_count || 0,
    cycles: row.cycles || 0,
    total_token_estimate: Number(row.total_token_estimate) || 0,
    total_wall_ms: Number(row.total_wall_ms) || 0,
    avg_wall_ms: row.avg_wall_ms || 0,
    success_count: row.success_count || 0,
    failure_count: row.failure_count || 0,
    total_retries: row.total_retries || 0,
    total_repair_attempts: row.total_repair_attempts || 0,
    avg_useful_work_score: row.avg_useful_work_score != null ? Number(row.avg_useful_work_score) : null,
    token_note: 'total_token_estimate sums labeled estimates only — not exact billing',
  };
}
