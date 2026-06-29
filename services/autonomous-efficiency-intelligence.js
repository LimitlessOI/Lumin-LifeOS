/**
 * SYNOPSIS: Efficiency intelligence — aggregates from autonomous_telemetry_events only.
 * Efficiency intelligence — aggregates from autonomous_telemetry_events only.
 * No invented scores; every metric cites row counts / receipt evidence.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

function pct(num, den) {
  if (!den) return null;
  return Math.round((num / den) * 1000) / 10;
}

function round3(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Math.round(Number(n) * 1000) / 1000;
}

export async function computeEfficiencyIntelligence(pool, { sessionId, sinceHours = 168 } = {}) {
  if (!pool?.query) {
    return { ok: false, status: 'NOT_WIRED', reason: 'no_pool' };
  }

  const params = [String(sinceHours)];
  const sessionFilter = sessionId ? ' AND session_id = $2' : '';
  if (sessionId) params.push(sessionId);

  const baseWhere = `created_at >= NOW() - ($1 || ' hours')::interval${sessionFilter}`;

  const [{ rows: totals }] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS events,
         COUNT(DISTINCT session_id)::int AS sessions,
         SUM(COALESCE(total_token_estimate, 0))::bigint AS tokens_est,
         SUM(COALESCE(wall_clock_ms, 0))::bigint AS wall_ms,
         SUM(CASE WHEN success THEN 1 ELSE 0 END)::int AS successes,
         SUM(CASE WHEN success IS FALSE OR success IS NULL THEN 1 ELSE 0 END)::int AS failures,
         SUM(COALESCE(retries, 0))::int AS retries,
         SUM(COALESCE(repair_attempts, 0))::int AS repair_attempts,
         SUM(CASE WHEN hallucination_detected THEN 1 ELSE 0 END)::int AS hallucinations,
         SUM(CASE WHEN drift_detected THEN 1 ELSE 0 END)::int AS drift_events,
         AVG(useful_work_score) FILTER (WHERE useful_work_score IS NOT NULL) AS avg_useful,
         SUM(COALESCE(repair_latency_ms, 0))::bigint AS repair_ms,
         SUM(CASE WHEN task_type LIKE 'builder%' AND success THEN 1 ELSE 0 END)::int AS build_success,
         SUM(CASE WHEN task_type LIKE 'builder%' THEN 1 ELSE 0 END)::int AS build_total,
         SUM(CASE WHEN task_type LIKE 'self_repair%' AND success THEN 1 ELSE 0 END)::int AS repair_success,
         SUM(CASE WHEN task_type LIKE 'self_repair%' THEN 1 ELSE 0 END)::int AS repair_total
       FROM autonomous_telemetry_events
       WHERE ${baseWhere}`,
      params
    ),
  ]);

  const t = totals[0] || {};
  const events = t.events || 0;
  if (!events) {
    return {
      ok: false,
      status: 'NO_DATA',
      note: 'No telemetry rows in window — run a governed session first',
      since_hours: sinceHours,
      session_id: sessionId || null,
    };
  }

  const usefulSum = await pool.query(
    `SELECT COALESCE(SUM(useful_work_score), 0) AS useful_sum
     FROM autonomous_telemetry_events
     WHERE ${baseWhere} AND useful_work_score IS NOT NULL`,
    params
  );
  const usefulSumVal = Number(usefulSum.rows[0]?.useful_sum) || 0;
  const tokensEst = Number(t.tokens_est) || 0;
  const usefulPer1k = tokensEst > 0 ? round3((usefulSumVal / tokensEst) * 1000) : null;

  const byTask = await pool.query(
    `SELECT task_type,
            COUNT(*)::int AS count,
            AVG(wall_clock_ms)::int AS avg_wall_ms,
            SUM(COALESCE(total_token_estimate, 0))::bigint AS tokens_est,
            AVG(useful_work_score) FILTER (WHERE useful_work_score IS NOT NULL) AS avg_useful,
            SUM(CASE WHEN success THEN 1 ELSE 0 END)::int AS successes
     FROM autonomous_telemetry_events
     WHERE ${baseWhere}
     GROUP BY task_type
     ORDER BY count DESC`,
    params
  );

  const byModel = await pool.query(
    `SELECT model_used,
            COUNT(*)::int AS count,
            SUM(COALESCE(total_token_estimate, 0))::bigint AS tokens_est,
            AVG(wall_clock_ms)::int AS avg_wall_ms,
            AVG(useful_work_score) FILTER (WHERE useful_work_score IS NOT NULL) AS avg_useful
     FROM autonomous_telemetry_events
     WHERE ${baseWhere} AND model_used IS NOT NULL
     GROUP BY model_used
     ORDER BY avg_useful DESC NULLS LAST, count DESC`,
    params
  );

  const phaseLatency = await pool.query(
    `SELECT
       AVG(decision_latency_ms)::int AS avg_decision_ms,
       AVG(build_latency_ms)::int AS avg_build_ms,
       AVG(verification_latency_ms)::int AS avg_verify_ms,
       AVG(repair_latency_ms)::int AS avg_repair_ms
     FROM autonomous_telemetry_events
     WHERE ${baseWhere}`,
    params
  );
  const ph = phaseLatency.rows[0] || {};

  const retryWastePct = pct(t.retries || 0, events);
  const failedBuildPct = pct((t.build_total || 0) - (t.build_success || 0), t.build_total || 0);
  const avgRepairCostMs =
    (t.repair_attempts || 0) > 0 ? Math.round(Number(t.repair_ms) / Number(t.repair_attempts)) : null;

  const bottlenecks = byTask.rows
    .filter((r) => r.avg_wall_ms > 0)
    .sort((a, b) => b.avg_wall_ms - a.avg_wall_ms)
    .slice(0, 5)
    .map((r) => ({
      task_type: r.task_type,
      avg_wall_ms: r.avg_wall_ms,
      count: r.count,
      evidence: `${r.count} telemetry row(s)`,
    }));

  const recommendations = [];
  if ((t.drift_events || 0) > 0) {
    recommendations.push({
      type: 'drift',
      message: `${t.drift_events} drift event(s) in window — prioritize deploy-check after redeploy`,
      evidence: 'drift_detected=true rows',
    });
  }
  if ((t.hallucinations || 0) > 0) {
    recommendations.push({
      type: 'hallucination',
      message: `${t.hallucinations} hallucination flag(s) — review builder spec contamination`,
      evidence: 'hallucination_detected=true rows',
    });
  }
  if (retryWastePct != null && retryWastePct > 20) {
    recommendations.push({
      type: 'retry_waste',
      message: `Retry waste ${retryWastePct}% of events — reduce mid-rollout execute`,
      evidence: 'sum(retries)/event_count',
    });
  }
  const slowest = bottlenecks[0];
  if (slowest) {
    recommendations.push({
      type: 'latency',
      message: `Slowest phase: ${slowest.task_type} avg ${slowest.avg_wall_ms}ms`,
      evidence: slowest.evidence,
    });
  }

  const topModel = byModel.rows[0];
  if (topModel?.avg_useful != null) {
    recommendations.push({
      type: 'model',
      message: `Best avg useful_work among models with data: ${topModel.model_used} (${round3(topModel.avg_useful)})`,
      evidence: `${topModel.count} row(s)`,
    });
  }

  return {
    ok: true,
    status: 'COMPUTED_FROM_TELEMETRY',
    since_hours: sinceHours,
    session_id: sessionId || null,
    event_count: events,
    metrics: {
      total_token_estimate_sum: tokensEst,
      useful_work_per_1k_tokens_estimate: usefulPer1k,
      useful_work_per_1k_method: tokensEst > 0 ? 'sum(useful_work_score)/sum(total_token_estimate)*1000' : null,
      average_repair_cost_ms: avgRepairCostMs,
      average_successful_build_latency_ms: null,
      retry_waste_pct: retryWastePct,
      failed_build_pct: failedBuildPct,
      proof_recovery_time_ms: avgRepairCostMs,
      hallucination_frequency: t.hallucinations || 0,
      pb_violation_attempts_prevented: null,
      context_growth_rate: null,
      build_success_pct: pct(t.build_success, t.build_total),
      repair_success_pct: pct(t.repair_success, t.repair_total),
      avg_cycle_duration_ms: events ? Math.round(Number(t.wall_ms) / events) : null,
      avg_useful_work_score: round3(t.avg_useful),
    },
    phase_latency: {
      decision_ms: ph.avg_decision_ms,
      build_ms: ph.avg_build_ms,
      verification_ms: ph.avg_verify_ms,
      repair_ms: ph.avg_repair_ms,
    },
    by_task_type: byTask.rows,
    by_model: byModel.rows,
    bottlenecks,
    recommendations,
    not_wired: {
      pb_violation_attempts_prevented: 'No counter table — would need halt_log join',
      context_growth_rate: 'No context_size_bytes captured yet',
      average_successful_build_latency_ms: 'Requires build success filter with build_latency_ms populated',
    },
    token_note: 'All token figures are estimates where token_estimate_method != exact_usage',
  };
}
