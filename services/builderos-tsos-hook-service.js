/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * BuilderOS TSOS internal hook — emits tsos_internal_hook telemetry row
 * after a governed loop job commits. Proof source for tsos_internal_hooks
 * maturity scoring (TSOS_HOOK_BOUNDARY.md). Only emits on actual commit.
 */

/**
 * Emit a TSOS hook reading row after a governed loop job commits.
 * @param {object} pool - pg Pool
 * @param {{ jobId, modelUsed, outputBytes, repairAttempts, durationMs, committed }} data
 */
export async function emitTSOSHookReading(pool, data) {
  const { jobId, modelUsed, outputBytes, repairAttempts, durationMs, committed } = data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO autonomous_telemetry_events
         (task_type, model_used, total_token_estimate, task_description, metadata)
       VALUES ('tsos_internal_hook', $1, 0, 'builderos_governed_loop_commit', $2)
       RETURNING id`,
      [modelUsed || null, JSON.stringify({ job_id: jobId, output_bytes: outputBytes, repair_attempts: repairAttempts, duration_ms: durationMs, committed })]
    );
    return { ok: true, row_id: rows[0].id };
  } catch (error) {
    console.error('[TSOS-HOOK] emit failed:', error.message);
    return { ok: false, error: error.message };
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