/**
 * Deploy-triggered self-repair check — runs once on boot or when called.
 * No constant polling. No autonomy escalation beyond approved PB.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/SSOT_NORTH_STAR.md Article II §2.16
 */

import { buildSupervisedAutonomyReadiness } from './supervised-autonomy-readiness.js';
import { normalizeSha } from './oil-self-repair-detector.js';
import { runSelfRepairExecutor, EXECUTOR_MAX_ATTEMPTS } from './self-repair-executor.js';

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
 * Run deploy repair check — dry_run plans only; live invokes executor (max_attempts=2).
 */
export async function runDeployRepairCheck(pool, { dryRun = false, triggeredBy = 'deploy-check' } = {}) {
  const railwayDeploySha = normalizeSha(
    process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ''
  );
  const readiness = await buildSupervisedAutonomyReadiness(pool, { railwayDeploySha });
  const drift = detectDeployProofDrift(readiness);

  if (!drift.should_repair) {
    return {
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
    };
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
    return {
      ok: plan.audit_result === 'DRY_RUN',
      action: 'dry_run',
      reason: plan.stopped_reason || 'planned',
      drift,
      repair_id: repairId,
      max_attempts: EXECUTOR_MAX_ATTEMPTS,
      executor_result: plan,
    };
  }

  const result = await runSelfRepairExecutor({
    pool,
    dryRun: false,
    repairId,
    triggeredBy,
  });

  return {
    ok: result.audit_result === 'PASS',
    action: 'execute',
    reason: result.stopped_reason || result.audit_result,
    drift,
    repair_id: repairId,
    max_attempts: EXECUTOR_MAX_ATTEMPTS,
    executor_result: result,
  };
}