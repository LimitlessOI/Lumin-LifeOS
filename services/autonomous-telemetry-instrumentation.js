/**
 * SYNOPSIS: Thin instrumentation helpers — map domain events → telemetry rows.
 * Thin instrumentation helpers — map domain events → telemetry rows.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import {
  emitAutonomousTelemetry,
  estimateTokensFromChars,
  newRunId,
  TOKEN_ESTIMATE_METHOD,
} from './autonomous-telemetry-service.js';

export async function emitBuilderTelemetry(pool, {
  domain,
  task,
  model_used,
  rawOutput,
  placement,
  status,
  failureStage,
  failureReason,
  committed,
  wallClockMs,
  sessionId,
  cycleId,
}) {
  const tokenEst = estimateTokensFromChars(String(task || '').length, { label: TOKEN_ESTIMATE_METHOD.CHARS_DIV_4 });
  const outEst = estimateTokensFromChars(rawOutput?.length || 0);
  const hallucination =
    failureReason?.includes('spec_contamination') ||
    failureStage === 'spec_contamination' ||
    false;

  return emitAutonomousTelemetry(pool, {
    run_id: newRunId('builder'),
    cycle_id: cycleId || null,
    session_id: sessionId || null,
    task_type: 'builder.build',
    task_goal: task ? String(task).slice(0, 500) : null,
    model_used: model_used || null,
    token_input_estimate: tokenEst.total,
    token_output_estimate: outEst.total,
    total_token_estimate: tokenEst.total + outEst.total,
    token_estimate_method: TOKEN_ESTIMATE_METHOD.CHARS_DIV_4,
    wall_clock_ms: wallClockMs ?? null,
    build_latency_ms: wallClockMs ?? null,
    audit_result: status || null,
    stopped_reason: failureReason || null,
    success: status === 'committed' || status === 'generated' || committed === true,
    hallucination_detected: hallucination,
    commits_created: committed ? 1 : 0,
    files_changed: placement?.target_file ? [placement.target_file] : [],
    useful_work_score: committed ? 1 : status === 'generated' ? 0.5 : 0,
    useful_work_method: committed ? 'builder_committed' : 'builder_partial',
    metadata: { failure_stage: failureStage, domain },
  });
}

export async function emitSelfRepairTelemetry(pool, {
  result,
  repairId,
  dryRun,
  triggeredBy,
  deploySha,
  durationMs,
  sessionId,
  cycleId,
}) {
  const steps = result.steps_executed || [];
  const attempts = new Set(steps.map((s) => s.attempt).filter(Boolean));
  const receipts = (result.receipts_written || []).map((r) => r.receipt_id).filter(Boolean);
  const proofAfter =
    result.verification_result?.readiness?.proof_freshness_overall ||
    result.verification_result?.proof_freshness?.freshness?.overall ||
    null;

  let usefulScore = 0;
  let usefulMethod = 'failed';
  if (result.audit_result === 'PASS') {
    usefulScore = 1;
    usefulMethod = 'repair_pass';
  } else if (result.audit_result === 'DRY_RUN') {
    usefulScore = 0.5;
    usefulMethod = 'repair_dry_run';
  } else if (result.audit_result === 'BLOCKED') {
    usefulScore = 0;
    usefulMethod = 'blocked';
  }

  return emitAutonomousTelemetry(pool, {
    run_id: newRunId('self_repair'),
    cycle_id: cycleId || null,
    session_id: sessionId || null,
    task_type: dryRun ? 'self_repair.dry_run' : 'self_repair.execute',
    task_goal: `Self-repair ${repairId}`,
    wall_clock_ms: durationMs ?? null,
    repair_latency_ms: durationMs ?? null,
    retries: Math.max(0, attempts.size - 1),
    repair_attempts: attempts.size || (dryRun ? 0 : 1),
    proof_status_before: result.audit_before?.proof_freshness_overall || null,
    proof_status_after: proofAfter,
    audit_result: result.audit_result,
    stopped_reason: result.stopped_reason,
    success: result.audit_result === 'PASS' || result.audit_result === 'DRY_RUN',
    receipts_created: receipts,
    deploy_sha: deploySha,
    useful_work_score: usefulScore,
    useful_work_method: usefulMethod,
    drift_detected: result.audit_before?.proof_freshness_overall === 'STALE' && proofAfter === 'CURRENT',
    metadata: { triggered_by: triggeredBy, repair_id: repairId },
  });
}

export async function emitPreventionHookTelemetry(pool, {
  outcome,
  triggeredBy,
  durationMs,
  sessionId,
  cycleId,
}) {
  const hook = outcome.prevention_hook || {};
  const receipts = (outcome.executor_result?.receipts_written || []).map((r) => r.receipt_id).filter(Boolean);

  return emitAutonomousTelemetry(pool, {
    run_id: newRunId('prevention_hook'),
    cycle_id: cycleId || null,
    session_id: sessionId || null,
    task_type: 'prevention_hook.deploy_drift',
    task_goal: 'CAND-001 deploy_drift prevention hook',
    wall_clock_ms: durationMs ?? null,
    repair_latency_ms: outcome.action === 'execute' ? durationMs : null,
    verification_latency_ms: outcome.action === 'skip' ? durationMs : null,
    audit_result: outcome.executor_result?.audit_result || outcome.action,
    stopped_reason: outcome.reason,
    success: outcome.ok,
    proof_status_before: outcome.readiness_summary?.proof_freshness || null,
    proof_status_after:
      outcome.executor_result?.verification_result?.readiness?.proof_freshness_overall || null,
    drift_detected: Boolean(outcome.drift?.drift),
    repair_attempts: outcome.action === 'execute' ? 1 : 0,
    receipts_created: receipts,
    useful_work_score: outcome.action === 'skip' && outcome.reason === 'proof_current' ? 0.35 : outcome.ok ? 1 : 0,
    useful_work_method: 'prevention_hook_outcome',
    metadata: {
      hook_id: hook.hook_id,
      candidate_rule_id: hook.candidate_rule_id,
      triggered_by: triggeredBy,
    },
  });
}
