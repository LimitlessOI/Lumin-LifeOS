/**
 * SYNOPSIS: Governed automatic proof parity after BuilderOS commits that trigger deploy drift.
 * Uses the existing deploy-check → self-repair executor chain (PF-001→PF-002→PF-003).
 * Never manipulates alpha status directly; fail-closed if refresh fails.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { evaluateProofFreshnessFromPool } from './oil-proof-freshness.js';
import { runDeployDriftPreventionHook } from './self-repair-deploy-scheduler.js';
import { normalizeSha } from './oil-self-repair-detector.js';
import { writeSecurityReceipt, SECURITY_RECEIPT_TYPES } from './oil-security-receipts.js';

const SETTLE_MS = Number(process.env.BUILDEROS_PROOF_PARITY_SETTLE_MS || 90_000);
const POLL_MS = Number(process.env.BUILDEROS_PROOF_PARITY_POLL_MS || 15_000);
const MAX_ATTEMPTS = Number(process.env.BUILDEROS_PROOF_PARITY_MAX_ATTEMPTS || 3);

/** Debounce: multiple commits in one session coalesce to one parity pass. */
let debounceTimer = null;
let debounceMeta = null;

function currentDeploySha() {
  return normalizeSha(process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '');
}

async function writeProofParityPendingReceipt(pool, meta = {}) {
  try {
    await writeSecurityReceipt(
      SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION,
      {
        type: 'builderos_proof_parity_pending',
        status: 'PENDING',
        subject: meta.jobId || 'governed-loop-commit',
        summary: 'Governed commit awaiting deploy-settled proof parity refresh',
        job_id: meta.jobId || null,
        triggered_by: meta.triggeredBy || null,
        deploy_sha_at_schedule: currentDeploySha(),
      },
      pool,
    );
  } catch {
    // Receipt is audit-only; boot passes still detect STALE proof directly.
  }
}

/**
 * Schedule governed proof parity refresh after a successful governed commit.
 * Waits for deploy settle before invoking deploy-check (no mid-rollout repair).
 */
export function scheduleProofParityAfterGovernedCommit(pool, meta = {}) {
  if (!pool) return { scheduled: false, reason: 'no_pool' };

  writeProofParityPendingReceipt(pool, meta).catch(() => {});

  debounceMeta = {
    jobId: meta.jobId || null,
    triggeredBy: meta.triggeredBy || (meta.jobId ? `governed-loop-${meta.jobId}` : 'governed-loop-commit'),
    scheduled_at: new Date().toISOString(),
    deploy_sha_at_schedule: currentDeploySha(),
  };

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const runMeta = debounceMeta;
    debounceMeta = null;
    runGovernedProofParityRefresh(pool, runMeta).catch(() => {});
  }, SETTLE_MS);

  return {
    scheduled: true,
    settle_ms: SETTLE_MS,
    triggered_by: debounceMeta.triggeredBy,
    deploy_sha_at_schedule: debounceMeta.deploy_sha_at_schedule,
  };
}

/**
 * Run governed proof parity refresh: detect STALE → deploy-check → verify CURRENT.
 * @returns {Promise<{ ok, action, reason, attempts, freshness, outcome? }>}
 */
export async function runGovernedProofParityRefresh(pool, meta = {}) {
  const triggeredBy = meta.triggeredBy || 'builderos-governed-proof-parity';
  let lastOutcome = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const deploySha = currentDeploySha();
    const freshness = await evaluateProofFreshnessFromPool(pool, { railwayDeploySha: deploySha });

    if (freshness.overall === 'CURRENT') {
      return {
        ok: true,
        action: 'skip',
        reason: 'proof_already_current',
        attempts: attempt,
        freshness: freshness.overall,
        deploy_sha: deploySha,
        job_id: meta.jobId || null,
      };
    }

    lastOutcome = await runDeployDriftPreventionHook(pool, {
      dryRun: false,
      triggeredBy: `${triggeredBy}:attempt-${attempt}`,
    });

    const afterDeploySha = currentDeploySha();
    const afterFreshness = await evaluateProofFreshnessFromPool(pool, { railwayDeploySha: afterDeploySha });

    if (afterFreshness.overall === 'CURRENT' && lastOutcome.ok) {
      try {
        await writeSecurityReceipt(
          SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION,
          {
            type: 'builderos_proof_parity_resolved',
            status: 'PASS',
            subject: meta.jobId || 'governed-loop-commit',
            summary: 'Proof parity restored after governed commit deploy drift',
            job_id: meta.jobId || null,
            deploy_sha: afterDeploySha,
            receipt_sha: afterFreshness.proofs?.gemini_runtime?.receipt_sha || null,
            triggered_by: triggeredBy,
          },
          pool,
        );
      } catch {
        // resolution already verified via freshness evaluation
      }
      return {
        ok: true,
        action: lastOutcome.action || 'execute',
        reason: lastOutcome.reason || 'PASS',
        attempts: attempt,
        freshness: afterFreshness.overall,
        deploy_sha: afterDeploySha,
        receipt_sha: afterFreshness.proofs?.gemini_runtime?.receipt_sha || null,
        job_id: meta.jobId || null,
        outcome: {
          action: lastOutcome.action,
          reason: lastOutcome.reason,
          drift: lastOutcome.drift,
        },
      };
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }

  const finalDeploySha = currentDeploySha();
  const finalFreshness = await evaluateProofFreshnessFromPool(pool, { railwayDeploySha: finalDeploySha });

  return {
    ok: false,
    action: 'failed',
    reason: 'proof_remains_stale_after_max_attempts',
    attempts: MAX_ATTEMPTS,
    freshness: finalFreshness.overall,
    deploy_sha: finalDeploySha,
    job_id: meta.jobId || null,
    last_outcome: lastOutcome
      ? { action: lastOutcome.action, reason: lastOutcome.reason, ok: lastOutcome.ok }
      : null,
  };
}

/** Test helper — reset debounce state. */
export function _resetProofParityScheduleForTests() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  debounceMeta = null;
}
