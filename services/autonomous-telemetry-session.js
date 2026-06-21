/**
 * SYNOPSIS: Governed autonomous telemetry session — PB-only, bounded cycles, no escalation.
 * Governed autonomous telemetry session — PB-only, bounded cycles, no escalation.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/SSOT_NORTH_STAR.md Article II §2.16
 */

import { buildSupervisedAutonomyReadiness } from './supervised-autonomy-readiness.js';
import { runDeployDriftPreventionHook } from './self-repair-deploy-scheduler.js';
import { runSelfRepairExecutor } from './self-repair-executor.js';
import { evaluateProofFreshnessFromPool } from './oil-proof-freshness.js';
import { buildPreventionHooksStatus } from './self-repair-prevention-hook-planner.js';
import { readLatestRepairMemory } from './self-repair-memory.js';
import {
  emitAutonomousTelemetry,
  newRunId,
  newSessionId,
} from './autonomous-telemetry-service.js';
import { computeEfficiencyIntelligence } from './autonomous-efficiency-intelligence.js';
import { normalizeSha } from './oil-self-repair-detector.js';
import { shouldSkipOuterEmit, buildSuppressedOuterTelemetryResult } from './telemetry-cycle-guard.js';

const DEFAULT_MAX_CYCLES = 5;
const DEFAULT_MAX_MINUTES = 45;

function usefulScoreFromOutcome({ success, action, auditResult, proofStatus }) {
  if (auditResult === 'PASS' || (success && action === 'execute')) return { score: 1, method: 'pass_or_execute' };
  if (action === 'skip' && auditResult !== 'FAILED') return { score: 0.35, method: 'verified_skip' };
  if (auditResult === 'BLOCKED' && proofStatus === 'CURRENT') {
    return { score: 0.35, method: 'verified_skip_no_repair_needed' };
  }
  if (auditResult === 'DRY_RUN') return { score: 0.5, method: 'dry_run_plan' };
  if (success) return { score: 0.6, method: 'success_generic' };
  return { score: 0, method: 'failed' };
}

async function emitCycleTelemetry(pool, base, extra = {}) {
  return emitAutonomousTelemetry(pool, { ...base, ...extra });
}

/**
 * Run bounded PB-governed session — each cycle emits telemetry.
 */
export async function runGovernedTelemetrySession(pool, {
  maxCycles = DEFAULT_MAX_CYCLES,
  maxMinutes = DEFAULT_MAX_MINUTES,
  triggeredBy = 'telemetry-session',
} = {}) {
  const sessionId = newSessionId();
  const started = Date.now();
  const deadline = started + maxMinutes * 60 * 1000;
  const deploySha = normalizeSha(process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '');

  const readinessBefore = await buildSupervisedAutonomyReadiness(pool, { railwayDeploySha: deploySha });
  if ((readinessBefore.adam_required_actions || []).length > 0) {
    return {
      ok: false,
      halted: true,
      reason: 'adam_required_stop',
      session_id: sessionId,
      adam_required: readinessBefore.adam_required_actions,
    };
  }

  const cycles = [];
  let cycleIndex = 0;

  const cycleDefs = [
    {
      name: 'deploy_prevention_hook',
      task_type: 'prevention_hook.deploy_drift',
      task_goal: 'Run deploy-check prevention hook once',
      emitsOwnTelemetry: true,
      run: async ({ sessionId: sid, cycleId: cid } = {}) => {
        const t0 = Date.now();
        const outcome = await runDeployDriftPreventionHook(pool, {
          dryRun: false,
          triggeredBy: `${triggeredBy}:cycle-deploy`,
          sessionId: sid,
          cycleId: cid,
        });
        const useful = usefulScoreFromOutcome({
          success: outcome.ok,
          action: outcome.action,
          auditResult: outcome.executor_result?.audit_result || outcome.action,
        });
        const receipts = (outcome.executor_result?.receipts_written || []).map((r) => r.receipt_id).filter(Boolean);
        return {
          wall_clock_ms: Date.now() - t0,
          repair_latency_ms: Date.now() - t0,
          success: outcome.ok,
          audit_result: outcome.executor_result?.audit_result || outcome.action,
          stopped_reason: outcome.reason,
          proof_status_before: readinessBefore.proof_freshness_overall,
          proof_status_after:
            outcome.executor_result?.verification_result?.readiness?.proof_freshness_overall ||
            outcome.readiness_summary?.proof_freshness ||
            null,
          drift_detected: Boolean(outcome.drift?.drift),
          repair_attempts: outcome.action === 'execute' ? 1 : 0,
          receipts_created: receipts,
          useful_work_score: useful.score,
          useful_work_method: useful.method,
          metadata: { action: outcome.action, hook: outcome.prevention_hook?.hook_id || null },
        };
      },
    },
    {
      name: 'proof_verification',
      task_type: 'verification.proof_freshness',
      task_goal: 'Read PF aggregate freshness (no AI spend)',
      run: async () => {
        const t0 = Date.now();
        const pf = await evaluateProofFreshnessFromPool(pool, { railwayDeploySha: deploySha });
        const current = pf?.overall === 'CURRENT';
        return {
          wall_clock_ms: Date.now() - t0,
          verification_latency_ms: Date.now() - t0,
          success: current,
          audit_result: pf?.overall || 'UNKNOWN',
          proof_status_after: pf?.overall || null,
          drift_detected: pf?.stale === true,
          useful_work_score: current ? 0.4 : 0.1,
          useful_work_method: 'proof_freshness_read',
          metadata: { stale_count: pf?.stale_count ?? null },
        };
      },
    },
    {
      name: 'self_repair_dry_run',
      task_type: 'self_repair.dry_run',
      task_goal: 'Plan PF chain without execution',
      emitsOwnTelemetry: true,
      run: async ({ sessionId: sid, cycleId: cid } = {}) => {
        const t0 = Date.now();
        const result = await runSelfRepairExecutor({
          pool,
          dryRun: true,
          repairId: 'DR-003-RECEIPT-STALE',
          triggeredBy: `${triggeredBy}:cycle-dry-run`,
          sessionId: sid,
          cycleId: cid,
        });
        const proofBefore = result.audit_before?.proof_freshness_overall || null;
        const blockedNoRepair =
          result.audit_result === 'BLOCKED' && proofBefore === 'CURRENT';
        const dryRunOk = result.audit_result === 'DRY_RUN' || blockedNoRepair;
        const useful = usefulScoreFromOutcome({
          success: dryRunOk,
          auditResult: result.audit_result,
          proofStatus: proofBefore,
        });
        return {
          wall_clock_ms: Date.now() - t0,
          repair_latency_ms: Date.now() - t0,
          success: dryRunOk,
          audit_result: result.audit_result,
          stopped_reason: result.stopped_reason,
          proof_status_before: proofBefore,
          useful_work_score: useful.score,
          useful_work_method: useful.method,
          metadata: {
            steps_planned: result.steps_planned?.length || 0,
            blocked_reason: blockedNoRepair ? 'proof_current_no_repair_needed' : null,
          },
        };
      },
    },
    {
      name: 'prevention_hooks_read',
      task_type: 'verification.prevention_hooks',
      task_goal: 'Read prevention hook status',
      run: async () => {
        const t0 = Date.now();
        const status = await buildPreventionHooksStatus(pool);
        return {
          wall_clock_ms: Date.now() - t0,
          verification_latency_ms: Date.now() - t0,
          success: status.wired_count > 0,
          audit_result: status.status,
          useful_work_score: status.wired_count ? 0.3 : 0,
          useful_work_method: 'hooks_status_read',
          metadata: { wired_count: status.wired_count, candidate_count: status.candidate_count },
        };
      },
    },
    {
      name: 'memory_lessons_read',
      task_type: 'verification.memory_lessons',
      task_goal: 'Read latest self-repair memory lessons',
      run: async () => {
        const t0 = Date.now();
        const memory = await readLatestRepairMemory(pool, 5);
        return {
          wall_clock_ms: Date.now() - t0,
          verification_latency_ms: Date.now() - t0,
          success: memory.ok && memory.count > 0,
          audit_result: memory.ok ? 'OK' : memory.status || 'NO_DATA',
          useful_work_score: memory.count ? 0.35 : 0,
          useful_work_method: 'memory_read',
          metadata: { source: memory.source, count: memory.count },
        };
      },
    },
  ];

  for (const def of cycleDefs) {
    if (cycleIndex >= maxCycles) break;
    if (Date.now() > deadline) break;

    cycleIndex += 1;
    const cycleId = `${sessionId}-c${cycleIndex}`;
    const runId = newRunId(def.task_type);

    let outcome;
    try {
      outcome = await def.run({ sessionId, cycleId });
    } catch (err) {
      outcome = {
        wall_clock_ms: 0,
        success: false,
        audit_result: 'ERROR',
        stopped_reason: err.message?.slice(0, 200),
        useful_work_score: 0,
        useful_work_method: 'exception',
      };
    }

    const tel = shouldSkipOuterEmit(def)
      ? buildSuppressedOuterTelemetryResult(`${def.name} emits own telemetry`)
      : await emitCycleTelemetry(pool, {
          run_id: runId,
          cycle_id: cycleId,
          session_id: sessionId,
          task_type: def.task_type,
          task_goal: def.task_goal,
          token_input_estimate: 0,
          token_output_estimate: 0,
          total_token_estimate: 0,
          token_estimate_method: 'not_available',
          deploy_sha: deploySha,
          pb_boundary: 'SYSTEM_AUTHORIZED_UNDER_PB',
          ...outcome,
        });

    cycles.push({
      cycle_id: cycleId,
      name: def.name,
      task_type: def.task_type,
      success: outcome.success,
      wall_clock_ms: outcome.wall_clock_ms,
      telemetry_written: tel.written,
      telemetry_id: tel.id || null,
    });
  }

  const efficiency = await computeEfficiencyIntelligence(pool, { sessionId, sinceHours: 1 });
  const durationMs = Date.now() - started;

  await emitAutonomousTelemetry(pool, {
    run_id: newRunId('session_summary'),
    session_id: sessionId,
    task_type: 'session.summary',
    task_goal: 'Governed telemetry session complete',
    wall_clock_ms: durationMs,
    success: cycles.every((c) => c.success),
    audit_result: 'COMPLETE',
    deploy_sha: deploySha,
    pb_boundary: 'SYSTEM_AUTHORIZED_UNDER_PB',
    useful_work_score: efficiency.metrics?.avg_useful_work_score ?? null,
    useful_work_method: efficiency.ok ? 'session_efficiency_aggregate' : null,
    metadata: {
      max_cycles: maxCycles,
      max_minutes: maxMinutes,
      cycles_completed: cycles.length,
      triggered_by: triggeredBy,
    },
  });

  return {
    ok: true,
    session_id: sessionId,
    cycles_completed: cycles.length,
    duration_ms: durationMs,
    cycles,
    efficiency,
    pb_boundary: 'SYSTEM_AUTHORIZED_UNDER_PB',
    promoted_to_invariant: false,
  };
}
