/**
 * SYNOPSIS: Fail-closed BuilderOS alpha readiness guards.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * @ssot docs/projects/builderos-remediation/BLUEPRINT.md
 */
function buildFailClosedReadinessBlockers({ proofFreshness, readiness }) {
  const blockers = [];

  if (proofFreshness?.overall !== 'CURRENT') {
    blockers.push('RUNTIME_PROOF_NOT_CURRENT');
  }

  if (readiness?.ready_for_supervised !== true) {
    blockers.push('SUPERVISED_READINESS_FALSE');
  }

  if ((readiness?.repair_queue_open || 0) > 0) {
    const hasStaleProofRepair = (readiness?.system_authorized_actions || []).some(
      (action) => action?.repair_id === 'DR-003-RECEIPT-STALE'
        || action?.issue_id === 'DR-003-RECEIPT-STALE'
        || action?.code === 'RECEIPT_STALE_RUNTIME_SHA'
    );
    if (hasStaleProofRepair) {
      blockers.push('STALE_PROOF_REPAIR_QUEUE_ACTIVE');
    }
  }

  return blockers;
}

function canReportAlphaReady({ proofFreshness, readiness, blockers }) {
  return proofFreshness?.overall === 'CURRENT'
    && readiness?.ready_for_supervised === true
    && Array.isArray(blockers)
    && blockers.length === 0;
}

function buildFakeGreenStatusNote({ proofFreshness, readiness, percentComplete }) {
  const currentBlockers = buildFailClosedReadinessBlockers({ proofFreshness, readiness });
  if (percentComplete >= 85 && !canReportAlphaReady({ proofFreshness, readiness, blockers: currentBlockers })) {
    return `High BuilderOS score (${percentComplete}%) does not override runtime truth: proof=${proofFreshness?.overall || 'UNKNOWN'}, ready_for_supervised=${readiness?.ready_for_supervised === true}.`;
  }
  return null;
}

export {
  buildFailClosedReadinessBlockers,
  canReportAlphaReady,
  buildFakeGreenStatusNote,
};
