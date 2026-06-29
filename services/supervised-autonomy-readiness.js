/**
 * SYNOPSIS: Supervised autonomy readiness — aggregates preflight, self-repair, Phase 14,
 * Supervised autonomy readiness — aggregates preflight, self-repair, Phase 14,
 * OIL misses, and proof freshness into one read-only report. No auto-run.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import { proofStoreFingerprint, readLatestPhase14Cert } from './builder-phase14-ledger.js';
import {
  detectRuntimeProofMismatch,
  detectProofStoreMismatch,
  normalizeSha,
  fetchGitHubMainSha,
  buildRepairQueue,
  summarizeOilMisses,
  readSelfRepairHistory,
  readOilMissedIssueReceipts,
} from './oil-self-repair-detector.js';
import {
  evaluateProofFreshnessFromPool,
  mergeRuntimeProofWithFreshness,
} from './oil-proof-freshness.js';
import { readReceiptsByType, SECURITY_RECEIPT_TYPES } from './oil-security-receipts.js';

import { deriveExecutionActions } from './pb-execution-authority.js';

function pushUnique(list, item) {
  const key = `${item.code}:${item.detail}`;
  if (!list.some((x) => `${x.code}:${x.detail}` === key)) list.push(item);
}

/** Build read-only supervised autonomy readiness from live runtime signals. */
export async function buildSupervisedAutonomyReadiness(pool, { railwayDeploySha } = {}) {
  const deploySha = normalizeSha(
    railwayDeploySha || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ''
  );
  const githubMain = await fetchGitHubMainSha();

  const geminiRows = pool?.query
    ? await readReceiptsByType(SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF, 1, pool)
    : [];
  const lp = geminiRows[0];
  const receiptCommitSha =
    normalizeSha(lp?.payload?.runtime?.commit_sha) ||
    normalizeSha(lp?.payload?.details?.runtime?.commit_sha);

  const runtimeProof = detectRuntimeProofMismatch({
    githubMainSha: githubMain.sha,
    railwayDeploySha: deploySha,
    receiptCommitSha,
  });

  const railwayStore = proofStoreFingerprint(process.env.DATABASE_URL);
  const proofStore = detectProofStoreMismatch(process.env.DATABASE_URL, railwayStore);
  const context = { runtimeProof, proofStore };

  const freshness = pool?.query
    ? await evaluateProofFreshnessFromPool(pool, { railwayDeploySha: deploySha, geminiReceiptRow: lp || null })
    : { overall: 'UNKNOWN', stale: false, proofs: {}, stale_proofs: [] };

  const runtimeMerged = mergeRuntimeProofWithFreshness(runtimeProof, freshness);
  const oilMisses = pool?.query ? await summarizeOilMisses(pool, context) : { active: [], active_count: 0 };
  const phase14Row = pool?.query ? await readLatestPhase14Cert(pool) : null;
  const selfRepairHistory = pool?.query ? await readSelfRepairHistory(pool, 5) : [];
  const oilMissedReceipts = pool?.query ? await readOilMissedIssueReceipts(pool, 5) : [];

  const repairQueue = pool?.query
    ? await buildRepairQueue(pool, context, {
        deploy: { ok: Boolean(deploySha) },
        proof_store_endpoint: { ok: true },
        gemini_receipt: { ok: Boolean(lp) },
        git: { ok: githubMain.ok !== false },
      })
    : { items: [], open_count: 0 };

  const blockers = [];
  const warnings = [];

  for (const m of runtimeMerged.p0_blockers || []) {
    pushUnique(blockers, {
      code: m.rule,
      severity: 'P0',
      detail: m.detail,
      source: 'runtime_proof',
    });
  }

  if (!deploySha) {
    pushUnique(blockers, {
      code: 'DEPLOY_SHA_MISSING',
      severity: 'P0',
      detail: 'Railway deploy SHA unavailable on runtime',
      source: 'builder_env',
    });
  }

  if (!process.env.GITHUB_TOKEN) {
    pushUnique(blockers, {
      code: 'GITHUB_TOKEN_MISSING',
      severity: 'P0',
      detail: 'GITHUB_TOKEN not set — Builder cannot commit',
      source: 'builder',
    });
  }

  if (freshness.stale || freshness.overall === 'STALE') {
    for (const key of freshness.stale_proofs || []) {
      const p = freshness.proofs?.[key];
      pushUnique(blockers, {
        code: p?.rule || key,
        severity: 'P1',
        detail: p?.reason || 'proof stale',
        source: 'proof_freshness',
        proof: key,
      });
    }
  }

  if (runtimeMerged.status === 'STALE' || runtimeMerged.status === 'NOT_VERIFIED') {
    for (const m of runtimeMerged.mismatches || []) {
      const target = m.severity === 'P0' || m.severity === 'P1' ? blockers : warnings;
      pushUnique(target, {
        code: m.rule,
        severity: m.severity,
        detail: m.detail,
        source: 'runtime_proof',
      });
    }
    if (runtimeMerged.status === 'STALE' && !freshness.stale) {
      pushUnique(blockers, {
        code: 'RUNTIME_PROOF_STALE',
        severity: 'P1',
        detail: 'Runtime proof status STALE',
        source: 'runtime_proof',
      });
    }
  }

  for (const miss of oilMisses.active || []) {
    pushUnique(blockers, {
      code: 'OIL_MISSED_ACTIVE',
      severity: miss.severity || 'P1',
      detail: miss.what_oil_missed,
      finding_id: miss.finding_id,
      source: 'oil_misses',
    });
  }

  if (phase14Row && !phase14Row.findings_json?.alpha_ready) {
    pushUnique(blockers, {
      code: 'PHASE14_NOT_ALPHA_READY',
      severity: 'P1',
      detail: 'Latest Phase 14 cert is not ALPHA_READY',
      source: 'phase14',
    });
  }

  for (const item of (repairQueue.items || []).filter((i) => i.status === 'OPEN')) {
    pushUnique(warnings, {
      code: item.detectRule || item.issueId,
      severity: item.severity || 'P2',
      detail: item.recommendedBuilderTask,
      source: 'repair_queue',
      issue_id: item.issueId,
    });
  }

  if (oilMisses.invalid_receipt_count > 0) {
    pushUnique(warnings, {
      code: 'OIL_RECEIPT_SCHEMA_INVALID',
      severity: 'P2',
      detail: `${oilMisses.invalid_receipt_count} oil_missed_issue receipt(s) fail validation`,
      source: 'oil_misses',
    });
  }

  if (proofStore.local_proof_only) {
    pushUnique(warnings, {
      code: 'LOCAL_PROOF_ONLY',
      severity: 'P2',
      detail: proofStore.detail || 'Operator shell DATABASE_URL differs from Railway proof store',
      source: 'proof_store',
    });
  }

  const ready_for_supervised =
    blockers.length === 0 &&
    runtimeMerged.status === 'VERIFIED' &&
    freshness.overall === 'CURRENT';

  const latest_receipts = {
    gemini_runtime_proof: lp
      ? {
          receipt_id: lp.id,
          timestamp: lp.created_at || null,
          commit_sha: receiptCommitSha,
        }
      : null,
    phase14_cert: phase14Row
      ? {
          receipt_id: phase14Row.id,
          timestamp: phase14Row.audited_at,
          alpha_ready: Boolean(phase14Row.findings_json?.alpha_ready),
        }
      : null,
    oil_missed_issue: oilMissedReceipts[0] || null,
    self_repair: selfRepairHistory[0] || null,
  };

  const execution = deriveExecutionActions({
    blockers,
    warnings,
    oilMisses,
    freshness,
    repairQueue,
  });

  const can_continue_under_approved_pb =
    execution.adam_required_actions.length === 0 && execution.system_authorized_actions.length > 0;

  return {
    ok: true,
    read_only: true,
    proof_source: 'supervised_autonomy_readiness_aggregate',
    generated_at: new Date().toISOString(),
    ready_for_supervised,
    can_continue_under_approved_pb,
    blocks_build: runtimeMerged.blocks_build === true,
    blockers,
    warnings,
    latest_receipts,
    proof_store_id: railwayStore.proof_store_id || null,
    deployed_sha: deploySha,
    github_main_sha: githubMain.sha || null,
    latest_runtime_proof_sha: receiptCommitSha,
    runtime_proof_status: runtimeMerged.status,
    proof_freshness_overall: freshness.overall,
    phase14_status: phase14Row?.findings_json?.alpha_ready ? 'ALPHA_READY' : phase14Row ? 'NOT_ALPHA_READY' : 'UNKNOWN',
    builder_github_token: Boolean(process.env.GITHUB_TOKEN),
    oil_misses_active: oilMisses.active_count ?? 0,
    repair_queue_open: repairQueue.open_count ?? 0,
    system_authorized_actions: execution.system_authorized_actions,
    adam_required_actions: execution.adam_required_actions,
    what_adam_must_decide: execution.adam_required_actions,
    pb_execution_authority: {
      rule: execution.governance_rule,
      boundary: execution.pb_boundary,
    },
    checks: {
      builder_preflight: deploySha && process.env.GITHUB_TOKEN ? 'PASS' : 'WARN',
      self_repair_audit: runtimeMerged.status,
      phase14_railway_canonical: phase14Row?.findings_json?.alpha_ready ? 'ALPHA_READY' : 'NOT_READY',
      command_center_v2: 'ASSUMED_LIVE',
      oil_missed_issues: oilMisses.active_count ? 'ACTIVE' : 'CLEAR',
      proof_freshness: freshness.overall,
    },
  };
}