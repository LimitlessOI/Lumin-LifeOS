/**
 * SYNOPSIS: Deploy-triggered self-repair check — runs once on boot or when called.
 * Deploy-triggered self-repair check — runs once on boot or when called.
 * No constant polling. No autonomy escalation beyond approved PB.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 * @ssot docs/constitution/NORTH_STAR_SSOT.md Article II §2.16
 */

import { buildSupervisedAutonomyReadiness } from './supervised-autonomy-readiness.js';
import { normalizeSha } from './oil-self-repair-detector.js';
import { runSelfRepairExecutor, EXECUTOR_MAX_ATTEMPTS } from './self-repair-executor.js';
import { findDeployDriftHookPlan } from './self-repair-prevention-hook-planner.js';
import { appendPreventionHookLog } from './self-repair-prevention-hook-log.js';
import { emitPreventionHookTelemetry } from './autonomous-telemetry-instrumentation.js';

export function isSelfRepairBootCheckEnabled() {
  return process.env.SELF_REPAIR_BOOT_CHECK !== '0';
}

/** Detect deploy SHA drift vs runtime proof receipt. */
export function detectDeployProofDrift(readiness = {}) {
  const deploy = normalizeSha(readiness.deployed_sha);
  const receipt = normalizeSha(readiness.latest_runtime_proof_sha);
  const stale =
    readiness.proof_freshness_overall === 'STALE' ||
    readiness.runtime_proof_status === 'STALE';
  const drift = Boolean(deploy && receipt && deploy !== receipt);
  return {
    stale,
    drift,
    deploy_sha: deploy,
    receipt_sha: receipt,
    should_repair: stale && drift,
  };
}

/**
 * Run deploy repair check — dry_run plans only; live invokes executor (max_attempts=3).
 * When viaPreventionHook=true, logs skip/execute to prevention hook JSONL (CAND-001 path).
 */
export async function runDeployRepairCheck(pool, {
  dryRun = false,
  triggeredBy = 'deploy-check',
  viaPreventionHook = false,
  sessionId = null,
  cycleId = null,
} = {}) {
  const started = Date.now();
  const hookPlan = viaPreventionHook ? await findDeployDriftHookPlan(pool) : null;
  const railwayDeploySha = normalizeSha(
    process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ''
  );
  const readiness = await buildSupervisedAutonomyReadiness(pool, { railwayDeploySha });
  const drift = detectDeployProofDrift(readiness);

  const hookMeta = hookPlan
    ? {
        hook_id: hookPlan.hook_id,
        candidate_rule_id: hookPlan.candidate_rule_id,
        classification: hookPlan.classification,
        confidence: hookPlan.confidence,
        source_receipt_ids: hookPlan.source_receipt_ids,
        verification_path: hookPlan.verification_path,
      }
    : null;

  if (!drift.should_repair) {
    const outcome = {
      ok: true,
      action: 'skip',
      reason: drift.stale ? 'stale_without_deploy_drift' : 'proof_current',
      drift,
      readiness_summary: {
        proof_freshness: readiness.proof_freshness_overall,
        ready_for_supervised: readiness.ready_for_supervised,
        repair_queue_open: readiness.repair_queue_open,
      },
      executor_result: null,
      prevention_hook: hookMeta,
    };
    if (viaPreventionHook && hookPlan?.hook_id) {
      appendPreventionHookLog({
        ...hookMeta,
        action: 'skip',
        reason: outcome.reason,
        triggered_by: triggeredBy,
        deploy_sha: drift.deploy_sha,
        proof_status: readiness.proof_freshness_overall,
        duration_ms: Date.now() - started,
      });
      await emitPreventionHookTelemetry(pool, {
        outcome,
        triggeredBy,
        durationMs: Date.now() - started,
        sessionId,
        cycleId,
      }).catch(() => {});
    }
    return outcome;
  }

  if ((readiness.adam_required_actions || []).length > 0) {
    return {
      ok: false,
      action: 'halt',
      reason: 'adam_required_stop',
      drift,
      readiness_summary: {
        proof_freshness: readiness.proof_freshness_overall,
        adam_required: readiness.adam_required_actions,
      },
      executor_result: null,
    };
  }

  const repairId =
    (readiness.repair_queue_open ?? 0) > 0 ? 'DR-003-RECEIPT-STALE' : 'all_authorized';

  if (dryRun) {
    const plan = await runSelfRepairExecutor({
      pool,
      dryRun: true,
      repairId,
      triggeredBy,
    });
    const outcome = {
      ok: plan.audit_result === 'DRY_RUN',
      action: 'dry_run',
      reason: plan.stopped_reason || 'planned',
      drift,
      repair_id: repairId,
      max_attempts: EXECUTOR_MAX_ATTEMPTS,
      executor_result: plan,
      prevention_hook: hookMeta,
    };
    if (viaPreventionHook && hookPlan?.hook_id) {
      appendPreventionHookLog({
        ...hookMeta,
        action: 'dry_run',
        reason: outcome.reason,
        triggered_by: triggeredBy,
        deploy_sha: drift.deploy_sha,
        proof_status: readiness.proof_freshness_overall,
        duration_ms: Date.now() - started,
      });
      await emitPreventionHookTelemetry(pool, {
        outcome,
        triggeredBy,
        durationMs: Date.now() - started,
        sessionId,
        cycleId,
      }).catch(() => {});
    }
    return outcome;
  }

  const result = await runSelfRepairExecutor({
    pool,
    dryRun: false,
    repairId,
    triggeredBy,
  });

  const outcome = {
    ok: result.audit_result === 'PASS',
    action: 'execute',
    reason: result.stopped_reason || result.audit_result,
    drift,
    repair_id: repairId,
    max_attempts: EXECUTOR_MAX_ATTEMPTS,
    executor_result: result,
    prevention_hook: hookMeta,
  };
  if (viaPreventionHook && hookPlan?.hook_id) {
    appendPreventionHookLog({
      ...hookMeta,
      action: outcome.action,
      reason: outcome.reason,
      triggered_by: triggeredBy,
      deploy_sha: drift.deploy_sha,
      proof_status:
        result.verification_result?.readiness?.proof_freshness_overall ||
        result.verification_result?.proof_freshness?.freshness?.overall ||
        readiness.proof_freshness_overall,
      duration_ms: Date.now() - started,
    });
    await emitPreventionHookTelemetry(pool, {
      outcome,
      triggeredBy,
      durationMs: Date.now() - started,
    }).catch(() => {});
  }
  return outcome;
}

/** Governed deploy_drift prevention hook — wraps deploy-check with hook logging. */
export async function runDeployDriftPreventionHook(pool, options = {}) {
  return runDeployRepairCheck(pool, {
    ...options,
    viaPreventionHook: true,
  });
}
