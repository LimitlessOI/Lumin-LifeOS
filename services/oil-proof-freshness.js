/**
 * SYNOPSIS: OIL proof freshness — stale runtime proof must not display as VERIFIED/CURRENT.
 * OIL proof freshness — stale runtime proof must not display as VERIFIED/CURRENT.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import { normalizeSha, shasEqual } from './oil-self-repair-detector.js';
import { readLatestPhase14Cert } from './builder-phase14-ledger.js';
import { readSelfRepairHistory } from './oil-self-repair-detector.js';
import { readReceiptsByType, SECURITY_RECEIPT_TYPES } from './oil-security-receipts.js';

/** Self-repair stored receipt max age before STALE (PF-003). */
export const SELF_REPAIR_AUDIT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * PF-002 tolerance: cert and repair receipt from the SAME cycle are typically
 * written ~500ms apart. A gap > 60s means a new repair ran AFTER the cert.
 */
const PF002_SAME_CYCLE_TOLERANCE_MS = 60_000;

export const PROOF_FRESHNESS_RULES = [
  {
    id: 'PF-001',
    proof: 'gemini_runtime',
    rule: 'GEMINI_STALE_VS_DEPLOY',
    description: 'Gemini runtime proof stale when receipt commit SHA != Railway deploy SHA',
    severity: 'P2',
  },
  {
    id: 'PF-002',
    proof: 'phase14',
    rule: 'PHASE14_STALE_VS_DEPLOY_OR_REPAIR',
    description:
      'Phase 14 cert stale when certified before latest repair or deploy has outrun certified proof',
    severity: 'P2',
  },
  {
    id: 'PF-003',
    proof: 'self_repair_audit',
    rule: 'SELF_REPAIR_AUDIT_MAX_AGE',
    description: 'Stored self-repair receipt stale when older than 24 hours',
    severity: 'P2',
  },
];

function parseTs(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Evaluate proof freshness from observed SHAs and receipt timestamps only.
 * Never marks STALE as VERIFIED.
 */
export function evaluateProofFreshness({
  railwayDeploySha,
  geminiReceipt = null,
  phase14Cert = null,
  latestSelfRepairReceiptAt = null,
  latestRepairReceiptAt = null,
  now = new Date(),
} = {}) {
  const deploySha = normalizeSha(railwayDeploySha);
  const receiptSha =
    normalizeSha(geminiReceipt?.commit_sha) ||
    normalizeSha(geminiReceipt?.payload?.runtime?.commit_sha) ||
    normalizeSha(geminiReceipt?.payload?.details?.runtime?.commit_sha);

  const geminiAt = parseTs(geminiReceipt?.created_at || geminiReceipt?.audited_at);
  const certifiedAt = parseTs(phase14Cert?.certified_at || phase14Cert?.audited_at);
  const repairAt = parseTs(latestRepairReceiptAt);
  const selfRepairAt = parseTs(latestSelfRepairReceiptAt);
  const nowMs = now.getTime();

  const proofs = {};

  // PF-001 — Gemini runtime vs deploy SHA
  let geminiStatus = 'UNKNOWN';
  let geminiReason = 'no_gemini_receipt';
  if (!geminiReceipt) {
    geminiReason = 'no_gemini_receipt';
  } else if (!deploySha) {
    geminiReason = 'deploy_sha_missing';
  } else if (!receiptSha) {
    geminiStatus = 'STALE';
    geminiReason = 'receipt_commit_sha_missing';
  } else if (!shasEqual(deploySha, receiptSha)) {
    geminiStatus = 'STALE';
    geminiReason = `receipt_sha=${receiptSha.slice(0, 12)} deploy_sha=${deploySha.slice(0, 12)}`;
  } else {
    geminiStatus = 'CURRENT';
    geminiReason = 'receipt_matches_deploy';
  }
  proofs.gemini_runtime = {
    status: geminiStatus,
    rule: 'PF-001',
    reason: geminiReason,
    receipt_at: geminiAt?.toISOString() ?? null,
    receipt_sha: receiptSha,
    deploy_sha: deploySha,
  };

  // PF-002 — Phase 14 vs deploy cycle or latest repair
  let phase14Status = 'UNKNOWN';
  let phase14Reason = 'no_phase14_cert';
  if (certifiedAt) {
    // Only mark STALE when repairAt is significantly newer than cert — same-cycle
    // ordering (cert written ~500ms before receipt) must not trigger false stale.
    const repairGapMs = repairAt ? repairAt.getTime() - certifiedAt.getTime() : 0;
    if (repairAt && repairGapMs > PF002_SAME_CYCLE_TOLERANCE_MS) {
      phase14Status = 'STALE';
      phase14Reason = 'certified_before_latest_repair';
    } else if (geminiStatus === 'STALE') {
      phase14Status = 'STALE';
      phase14Reason = 'deploy_newer_than_certified_proof';
    } else if (geminiStatus === 'CURRENT') {
      phase14Status = 'CURRENT';
      phase14Reason = 'cert_aligned_with_current_deploy';
    } else {
      phase14Status = 'UNKNOWN';
      phase14Reason = 'deploy_proof_unknown';
    }
  }
  proofs.phase14 = {
    status: phase14Status,
    rule: 'PF-002',
    reason: phase14Reason,
    certified_at: certifiedAt?.toISOString() ?? null,
    latest_repair_at: repairAt?.toISOString() ?? null,
    receipt_id: phase14Cert?.receipt_id ?? phase14Cert?.id ?? null,
  };

  // PF-003 — stored self-repair receipt age
  let selfRepairStatus = 'UNKNOWN';
  let selfRepairReason = 'no_stored_self_repair_receipt';
  let ageHours = null;
  if (selfRepairAt) {
    ageHours = (nowMs - selfRepairAt.getTime()) / 3600000;
    if (nowMs - selfRepairAt.getTime() > SELF_REPAIR_AUDIT_MAX_AGE_MS) {
      selfRepairStatus = 'STALE';
      selfRepairReason = `last_receipt_${Math.round(ageHours)}h_ago_exceeds_24h`;
    } else {
      selfRepairStatus = 'CURRENT';
      selfRepairReason = `last_receipt_${Math.round(ageHours * 10) / 10}h_ago`;
    }
  }
  proofs.self_repair_audit = {
    status: selfRepairStatus,
    rule: 'PF-003',
    reason: selfRepairReason,
    last_receipt_at: selfRepairAt?.toISOString() ?? null,
    max_age_hours: 24,
    age_hours: ageHours,
  };

  const staleEntries = Object.entries(proofs).filter(([, p]) => p.status === 'STALE');
  const allCurrent = Object.values(proofs).every((p) => p.status === 'CURRENT');

  return {
    overall: staleEntries.length ? 'STALE' : allCurrent ? 'CURRENT' : 'UNKNOWN',
    verified: staleEntries.length === 0 && allCurrent,
    stale: staleEntries.length > 0,
    stale_count: staleEntries.length,
    stale_proofs: staleEntries.map(([key]) => key),
    proofs,
    rules: PROOF_FRESHNESS_RULES,
    blocks_build: false,
    evaluated_at: now.toISOString(),
  };
}

/** Merge parity check with freshness — STALE never surfaces as VERIFIED. P0 only blocks builds. */
export function mergeRuntimeProofWithFreshness(runtimeProof, freshness) {
  const p0 = (runtimeProof.p0_blockers || []).length > 0;
  let status;
  if (p0) status = 'NOT_VERIFIED';
  else if (freshness.stale || freshness.overall === 'STALE') status = 'STALE';
  else if (runtimeProof.verified && freshness.overall === 'CURRENT') status = 'VERIFIED';
  else if (runtimeProof.mismatches?.length) status = 'NOT_VERIFIED';
  else if (freshness.overall === 'CURRENT') status = 'VERIFIED';
  else status = runtimeProof.status || 'NOT_VERIFIED';

  return {
    ...runtimeProof,
    status,
    verified: status === 'VERIFIED',
    freshness,
    blocks_build: p0,
  };
}

/** Load DB + env inputs for freshness evaluation. */
export async function gatherProofFreshnessContext(pool, {
  railwayDeploySha,
  geminiReceiptRow = null,
} = {}) {
  let geminiRow = geminiReceiptRow;
  if (!geminiRow && pool?.query) {
    const geminiRows = await readReceiptsByType(SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF, 1, pool);
    geminiRow = geminiRows[0] || null;
  }

  const phase14Row = pool?.query ? await readLatestPhase14Cert(pool) : null;
  const history = pool?.query ? await readSelfRepairHistory(pool, 50) : [];

  const latestSelfRepairReceiptAt = history[0]?.timestamp ?? null;
  const latestProofAffectingRepairAt = history.reduce((max, row) => {
    const isProofAffectingRepair =
      row?.type === 'self_repair_audit' && row?.repair_needed === true;
    if (!isProofAffectingRepair) return max;
    const ts = parseTs(row.timestamp);
    if (!ts) return max;
    return !max || ts > max ? ts : max;
  }, null);

  const phase14Cert = phase14Row
    ? {
        found: true,
        receipt_id: phase14Row.id,
        certified_at: phase14Row.audited_at,
        audited_at: phase14Row.audited_at,
        alpha_ready: Boolean(phase14Row.findings_json?.alpha_ready),
      }
    : { found: false };

  const geminiReceipt = geminiRow
    ? {
        id: geminiRow.id,
        created_at: geminiRow.created_at || geminiRow.audited_at,
        commit_sha:
          geminiRow.payload?.runtime?.commit_sha ||
          geminiRow.payload?.details?.runtime?.commit_sha,
        payload: geminiRow.payload,
      }
    : null;

  return {
    railwayDeploySha,
    geminiReceipt,
    phase14Cert,
    latestSelfRepairReceiptAt,
    latestRepairReceiptAt:
      latestProofAffectingRepairAt?.toISOString?.() ?? latestProofAffectingRepairAt,
  };
}

export async function evaluateProofFreshnessFromPool(pool, opts = {}) {
  const ctx = await gatherProofFreshnessContext(pool, opts);
  return evaluateProofFreshness(ctx);
}
