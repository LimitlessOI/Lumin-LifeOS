/**
 * SYNOPSIS: services/builderos-metrics-reporter.js
 * Compute all 15 required BuilderOS metrics from autonomous_telemetry_events.
 * All 15 fields always present in return value — null means NO_DATA, not absent.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

function round3(v) {
  if (v == null || isNaN(v)) return null;
  return Math.round(Number(v) * 1000) / 1000;
}

async function tryQuery(pool, sql, params) {
  try {
    const { rows } = await pool.query(sql, params);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Compute all BuilderOS metrics from telemetry events over [sinceHours] window.
 * @param {import('pg').Pool} pool
 * @param {{ sinceHours?: number }} opts
 * @returns {Promise<Record<string, number|null>>}
 */
export async function computeAllBuilderOSMetrics(pool, { sinceHours = 168 } = {}) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

  // ── Core aggregates (single pass) ────────────────────────────────────────
  const core = await tryQuery(pool, `
    SELECT
      AVG(useful_work_score)                                                   AS avg_useful_work_score,
      SUM(total_token_estimate)                                                AS total_token_estimate_sum,
      CASE WHEN SUM(total_token_estimate) > 0
        THEN SUM(useful_work_score) / SUM(total_token_estimate) * 1000.0
        ELSE NULL
      END                                                                      AS useful_work_per_1k_tokens_estimate,
      AVG(wall_clock_ms)                                                       AS avg_cycle_duration_ms,
      COUNT(*)                                                                 AS total_events,

      -- retry waste
      COUNT(*) FILTER (WHERE retries > 0) * 100.0 / NULLIF(COUNT(*), 0)       AS retry_waste_pct,

      -- hallucination frequency (proportion)
      COUNT(*) FILTER (WHERE hallucination_detected = true) * 1.0
        / NULLIF(COUNT(*), 0)                                                  AS hallucination_frequency,

      -- drift frequency (proportion)
      COUNT(*) FILTER (WHERE drift_detected = true) * 1.0
        / NULLIF(COUNT(*), 0)                                                  AS drift_frequency,

      -- overnight throughput (events per hour)
      COUNT(*) * 1.0 / $2                                                      AS overnight_throughput
    FROM autonomous_telemetry_events
    WHERE created_at >= $1
  `, [since, sinceHours]);

  // ── Build metrics ─────────────────────────────────────────────────────────
  const build = await tryQuery(pool, `
    SELECT
      COUNT(*) FILTER (WHERE success = false) * 100.0
        / NULLIF(COUNT(*), 0)                                                  AS failed_build_pct,
      AVG(build_latency_ms) FILTER (WHERE success = true AND build_latency_ms IS NOT NULL)
                                                                               AS average_successful_build_latency_ms
    FROM autonomous_telemetry_events
    WHERE task_type LIKE 'build%'
      AND created_at >= $1
  `, [since]);

  // ── Repair metrics ────────────────────────────────────────────────────────
  const repair = await tryQuery(pool, `
    SELECT
      AVG(wall_clock_ms)                                                       AS average_repair_cost_ms,
      COUNT(*) FILTER (WHERE success = true) * 100.0
        / NULLIF(COUNT(*), 0)                                                  AS repair_success_pct
    FROM autonomous_telemetry_events
    WHERE task_type LIKE 'self_repair%'
      AND created_at >= $1
  `, [since]);

  // ── Proof recovery time ───────────────────────────────────────────────────
  const proofRow = await tryQuery(pool, `
    SELECT AVG(wall_clock_ms) AS proof_recovery_time_ms
    FROM autonomous_telemetry_events
    WHERE task_type LIKE '%proof%'
      AND created_at >= $1
  `, [since]);

  // ── PB violation counter ──────────────────────────────────────────────────
  const pbRow = await tryQuery(pool, `
    SELECT COUNT(*) AS pb_violation_attempts_prevented
    FROM autonomous_telemetry_events
    WHERE stopped_reason = 'pb_violation_prevented'
      AND created_at >= $1
  `, [since]);

  // ── Autonomous continuation rate ──────────────────────────────────────────
  // Sessions with >1 event / total sessions with session_id
  const contRow = await tryQuery(pool, `
    SELECT
      COUNT(DISTINCT CASE WHEN cnt > 1 THEN session_id END) * 1.0
        / NULLIF(COUNT(DISTINCT session_id), 0)                                AS autonomous_continuation_rate
    FROM (
      SELECT session_id, COUNT(*) AS cnt
      FROM autonomous_telemetry_events
      WHERE created_at >= $1
        AND session_id IS NOT NULL
      GROUP BY session_id
    ) sub
  `, [since]);

  // ── Assemble all 15 metrics ───────────────────────────────────────────────
  const failedBuildPct = round3(build?.failed_build_pct);

  return {
    avg_useful_work_score:                round3(core?.avg_useful_work_score),
    total_token_estimate_sum:             core?.total_token_estimate_sum != null
                                            ? Number(core.total_token_estimate_sum) : null,
    useful_work_per_1k_tokens_estimate:   round3(core?.useful_work_per_1k_tokens_estimate),
    average_repair_cost_ms:               round3(repair?.average_repair_cost_ms),
    average_successful_build_latency_ms:  round3(build?.average_successful_build_latency_ms),
    retry_waste_pct:                      round3(core?.retry_waste_pct),
    failed_build_pct:                     failedBuildPct,
    hallucination_frequency:              round3(core?.hallucination_frequency),
    pb_violation_attempts_prevented:      pbRow?.pb_violation_attempts_prevented != null
                                            ? Number(pbRow.pb_violation_attempts_prevented) : null,
    context_growth_rate:                  null, // no context_size_bytes column in schema
    build_success_pct:                    failedBuildPct != null ? round3(100 - failedBuildPct) : null,
    repair_success_pct:                   round3(repair?.repair_success_pct),
    avg_cycle_duration_ms:                round3(core?.avg_cycle_duration_ms),
    proof_recovery_time_ms:               round3(proofRow?.proof_recovery_time_ms),
    drift_frequency:                      round3(core?.drift_frequency),
    overnight_throughput:                 round3(core?.overnight_throughput),
    autonomous_continuation_rate:         round3(contRow?.autonomous_continuation_rate),
  };
}
