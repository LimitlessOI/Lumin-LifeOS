// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import { Pool } from 'pg';
import { pool } from '../startup/db.js';

async function computeAllBuilderOSMetrics(pool, { sinceHours = 168 } = {}) {
  const metrics = {
    avg_useful_work_score: null,
    total_token_estimate_sum: null,
    useful_work_per_1k_tokens_estimate: null,
    average_repair_cost_ms: null,
    average_successful_build_latency_ms: null,
    retry_waste_pct: null,
    failed_build_pct: null,
    hallucination_frequency: null,
    pb_violation_attempts_prevented: null,
    context_growth_rate: null,
    build_success_pct: null,
    repair_success_pct: null,
    avg_cycle_duration_ms: null,
    proof_recovery_time_ms: null,
    drift_frequency: null,
    overnight_throughput: null,
    autonomous_continuation_rate: null,
  };

  try {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const sinceEpoch = Math.floor(since.getTime() / 1000);

    const avgUsefulWorkScoreQuery = `
      SELECT AVG(useful_work_score) 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.avg_useful_work_score = await pool.query(avgUsefulWorkScoreQuery, [sinceEpoch]);

    const totalTokenEstimateSumQuery = `
      SELECT SUM(token_estimate) 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.total_token_estimate_sum = await pool.query(totalTokenEstimateSumQuery, [sinceEpoch]);

    const usefulWorkPer1kTokensEstimateQuery = `
      SELECT SUM(useful_work_score) / SUM(token_estimate) * 1000 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.useful_work_per_1k_tokens_estimate = await pool.query(usefulWorkPer1kTokensEstimateQuery, [sinceEpoch]);

    const averageRepairCostMsQuery = `
      SELECT AVG(wall_time_ms) 
      FROM autonomous_telemetry_events 
      WHERE task_type LIKE 'self_repair%' AND created_at >= $1
    `;
    metrics.average_repair_cost_ms = await pool.query(averageRepairCostMsQuery, [sinceEpoch]);

    const averageSuccessfulBuildLatencyMsQuery = `
      SELECT AVG(wall_time_ms) 
      FROM autonomous_telemetry_events 
      WHERE task_type LIKE 'build%' AND success = TRUE AND created_at >= $1
    `;
    metrics.average_successful_build_latency_ms = await pool.query(averageSuccessfulBuildLatencyMsQuery, [sinceEpoch]);

    const retryWastePctQuery = `
      SELECT COUNT(retry_count > 0) / COUNT(*) * 100 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.retry_waste_pct = await pool.query(retryWastePctQuery, [sinceEpoch]);

    const failedBuildPctQuery = `
      SELECT COUNT(success = FALSE AND task_type LIKE 'build%') / COUNT(task_type LIKE 'build%') * 100 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.failed_build_pct = await pool.query(failedBuildPctQuery, [sinceEpoch]);

    const hallucinationFrequencyQuery = `
      SELECT COUNT(task_type = 'hallucination_detected') 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.hallucination_frequency = await pool.query(hallucinationFrequencyQuery, [sinceEpoch]);

    const pbViolationAttemptsPreventedQuery = `
      SELECT COUNT(task_type = 'pb_violation_prevented') 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.pb_violation_attempts_prevented = await pool.query(pbViolationAttemptsPreventedQuery, [sinceEpoch]);

    const buildSuccessPctQuery = `
      SELECT 100 - COUNT(success = FALSE AND task_type LIKE 'build%') / COUNT(task_type LIKE 'build%') * 100 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.build_success_pct = await pool.query(buildSuccessPctQuery, [sinceEpoch]);

    const repairSuccessPctQuery = `
      SELECT COUNT(success = TRUE AND task_type LIKE 'self_repair%') / COUNT(task_type LIKE 'self_repair%') * 100 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.repair_success_pct = await pool.query(repairSuccessPctQuery, [sinceEpoch]);

    const avgCycleDurationMsQuery = `
      SELECT AVG(wall_time_ms) 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.avg_cycle_duration_ms = await pool.query(avgCycleDurationMsQuery, [sinceEpoch]);

    const proofRecoveryTimeMsQuery = `
      SELECT AVG(wall_time_ms) 
      FROM autonomous_telemetry_events 
      WHERE task_type LIKE 'proof%' AND created_at >= $1
    `;
    metrics.proof_recovery_time_ms = await pool.query(proofRecoveryTimeMsQuery, [sinceEpoch]);

    const driftFrequencyQuery = `
      SELECT COUNT(drift_detected = TRUE) / COUNT(*) 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.drift_frequency = await pool.query(driftFrequencyQuery, [sinceEpoch]);

    const overnightThroughputQuery = `
      SELECT COUNT(*) / $1 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.overnight_throughput = await pool.query(overnightThroughputQuery, [sinceHours, sinceEpoch]);

    const autonomousContinuationRateQuery = `
      SELECT COUNT(DISTINCT session_id WHERE session_id IS NOT NULL) / NULLIF(COUNT(DISTINCT session_id), 0) 
      FROM autonomous_telemetry_events 
      WHERE created_at >= $1
    `;
    metrics.autonomous_continuation_rate = await pool.query(autonomousContinuationRateQuery, [sinceEpoch]);
  } catch (error) {
    console.error(error);
  }

  return metrics;
}

export { computeAllBuilderOSMetrics };