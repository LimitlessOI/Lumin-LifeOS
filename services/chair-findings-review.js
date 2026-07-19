/**
 * SYNOPSIS: Chair review of SENTRY findings — the "Chair reviews" half of the
 * D7 repair pipeline, built as real running code instead of doctrine.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Scope, stated honestly: the full D7-D10 vision has Chair as a real AI
 * reviewer that can brief-discuss with SENTRY and score priority via a
 * multi-model debate. This is a real, narrow, RULE-BASED first slice —
 * deterministic classification, not an AI call — because a deterministic
 * gate that correctly routes "needs founder judgment" vs "safe to auto-track"
 * is genuinely useful on its own and doesn't require standing up model-debate
 * infrastructure to ship. Upgrading specific check types to real AI review
 * (e.g. judging whether a proposed_solution is actually sound, not just
 * present) is a named next step, not done here.
 */

// Finding "check" types that are pure infrastructure/config — Chair can wave
// these through without founder judgment, matching the founder's own
// distinction in this codebase's operating doctrine: technical disputes get
// resolved without going to him; only business/product decisions do.
const AUTO_APPROVABLE_CHECKS = new Set(['ci_health', 'workflow_health']);

// Finding "check" types that touch product SCOPE/priority — what a product
// should build next is a business call, not a technical one (D8: Chair
// proactively interviews the founder for full blueprint coverage).
const FOUNDER_ESCALATION_CHECKS = new Set(['product_backlog']);

/**
 * Reviews ONE finding. Pure — no I/O, fully unit-testable.
 * SO-002 enforcement: a finding with no proposed_solution is REJECTED outright
 * — "a flag without a fix is an incomplete report," never silently passed
 * through as if it were actionable.
 */
export function reviewFinding(finding) {
  if (!finding || typeof finding !== 'object') {
    return { ...finding, chair_status: 'rejected', chair_reasoning: 'not a valid finding object' };
  }
  if (!finding.proposed_solution || String(finding.proposed_solution).trim().length < 10) {
    return {
      ...finding,
      chair_status: 'rejected',
      chair_reasoning: 'SO-002 violation: no concrete proposed_solution attached — a flag without a fix is an incomplete report',
    };
  }

  if (FOUNDER_ESCALATION_CHECKS.has(finding.check)) {
    return {
      ...finding,
      chair_status: 'escalate_to_founder',
      chair_reasoning: 'product scope/priority is a business decision, not a technical one — routed to founder per D8, not auto-approved',
    };
  }

  if (AUTO_APPROVABLE_CHECKS.has(finding.check)) {
    return {
      ...finding,
      chair_status: 'approved',
      chair_reasoning: 'infrastructure/config finding with a concrete solution — within technical authority, no founder judgment required',
    };
  }

  // Unknown check type — fail closed to founder review rather than silently
  // auto-approving something Chair has no classification rule for yet.
  return {
    ...finding,
    chair_status: 'escalate_to_founder',
    chair_reasoning: `unrecognized check type "${finding.check}" — no auto-approval rule exists for it yet, failing closed to founder review`,
  };
}

/**
 * Reviews a list of findings, sorted so the founder sees what needs a
 * decision first (P0 > P1 > P2) and escalations before quiet auto-approvals.
 */
export function reviewFindings(findings) {
  const reviewed = (Array.isArray(findings) ? findings : []).map(reviewFinding);
  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const statusRank = { escalate_to_founder: 0, approved: 1, rejected: 2 };
  return reviewed.sort((a, b) => {
    const statusDelta = (statusRank[a.chair_status] ?? 3) - (statusRank[b.chair_status] ?? 3);
    if (statusDelta !== 0) return statusDelta;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });
}
