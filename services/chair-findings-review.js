/**
 * SYNOPSIS: Chair review of SENTRY findings — the "Chair reviews" half of the
 * D7 repair pipeline, built as real running code instead of doctrine.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Two review paths, deliberately layered:
 *   - reviewFinding / reviewFindings: deterministic rule-based classification
 *     (kept as the fail-closed FLOOR — SO-003's "auto-failover, never idle"
 *     means Chair must still function with zero reasoning, not stop dead, if
 *     no model is available).
 *   - reviewFindingWithAI / reviewFindingsWithAI (2026-07-19): real AI
 *     judgment on top of that floor. Added because SO-003 explicitly names
 *     "the Chair debate/counsel channel" as a high-stakes reasoning path that
 *     "must never be served a canned/templated non-model answer in place of
 *     real reasoning" — and the rule-based-only version was exactly that: a
 *     canned template for every single finding, including the ones the
 *     founder most needs real judgment on. The AI layer can only ENRICH
 *     chair_reasoning with genuine analysis; it can never override
 *     chair_status for a FOUNDER_ESCALATION_CHECKS finding or an SO-002
 *     rejection — those are hard safety boundaries, not judgment calls, and
 *     letting a model response silently loosen them would be worse than not
 *     having AI review at all.
 */

// Finding "check" types that are pure infrastructure/config — Chair can wave
// these through without founder judgment, matching the founder's own
// distinction in this codebase's operating doctrine: technical disputes get
// resolved without going to him; only business/product decisions do.
const AUTO_APPROVABLE_CHECKS = new Set(['ci_health', 'workflow_health']);

// Finding "check" types that touch product SCOPE/priority — what a product
// should build next is a business call, not a technical one (D8: Chair
// proactively interviews the founder for full blueprint coverage).
// competitive_gap (2026-07-19): real web-research findings about what
// competitors do — always a product-direction call, same as product_backlog,
// never auto-approved regardless of how the research reads.
const FOUNDER_ESCALATION_CHECKS = new Set(['product_backlog', 'competitive_gap']);

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

function buildChairAIPrompt(finding, ruleBased) {
  return [
    'You are Chair, reviewing one system-health finding for a founder who runs this codebase alone.',
    'Give genuine judgment, not a restatement of the rule. Be specific and brief (under 120 words).',
    '',
    `Finding check type: ${finding.check}`,
    `Severity: ${finding.severity}`,
    `Summary: ${finding.summary}`,
    `Proposed solution: ${finding.proposed_solution}`,
    `Deterministic classification already applied (DO NOT contradict this — it is a fixed safety boundary, not your call): ${ruleBased.chair_status}`,
    `Rule reasoning: ${ruleBased.chair_reasoning}`,
    '',
    'Answer with genuine analysis: Is the proposed_solution actually sound, or does it miss something? Is there context the founder needs that the raw finding does not surface? Is this more urgent or less urgent than its stated severity suggests, and why? If you have nothing to add beyond the rule, say so plainly instead of padding.',
  ].join('\n');
}

/**
 * AI-enriched review of ONE finding. Falls back to the pure rule-based result
 * (with a labeled source) if no callModel is provided or the call fails —
 * SO-003 auto-failover: this must never leave a finding un-reviewed just
 * because a model call didn't work.
 */
export async function reviewFindingWithAI(finding, { callModel, model = 'claude_sonnet', logger = console } = {}) {
  const ruleBased = reviewFinding(finding);

  // SO-002 rejections are a factual check (is proposed_solution present?),
  // not a judgment call — no AI reasoning adds anything real here.
  if (ruleBased.chair_status === 'rejected') {
    return { ...ruleBased, chair_reasoning_source: 'rule_based' };
  }

  if (typeof callModel !== 'function') {
    logger?.warn?.({ finding_id: finding.id }, '[CHAIR-AI] no callModel available — using rule-based reasoning only (SO-003 fail-closed floor, not a canned override)');
    return { ...ruleBased, chair_reasoning_source: 'rule_based_no_model' };
  }

  try {
    const raw = await callModel(model, buildChairAIPrompt(finding, ruleBased), { maxOutputTokens: 300, taskType: 'chair_review' });
    const aiText = String(raw || '').trim();
    if (!aiText) {
      return { ...ruleBased, chair_reasoning_source: 'rule_based_empty_model_response' };
    }
    return {
      ...ruleBased,
      // chair_status is intentionally NOT overwritten from ruleBased — the AI
      // enriches reasoning, it does not get to loosen a safety boundary.
      chair_reasoning: `${ruleBased.chair_reasoning} | Chair (AI): ${aiText}`,
      chair_reasoning_source: 'ai_model',
    };
  } catch (err) {
    logger?.warn?.({ finding_id: finding.id, err: err.message }, '[CHAIR-AI] model call failed — falling back to rule-based reasoning');
    return { ...ruleBased, chair_reasoning_source: 'rule_based_model_error' };
  }
}

/**
 * AI-enriched review of a findings list, same sort order as reviewFindings.
 * Reviews sequentially (findings volume per audit cycle is small — a handful
 * at most — so there's no real cost pressure to parallelize and risk burst
 * rate-limits against the model provider).
 */
export async function reviewFindingsWithAI(findings, opts = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const reviewed = [];
  for (const finding of list) {
    reviewed.push(await reviewFindingWithAI(finding, opts));
  }
  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const statusRank = { escalate_to_founder: 0, approved: 1, rejected: 2 };
  return reviewed.sort((a, b) => {
    const statusDelta = (statusRank[a.chair_status] ?? 3) - (statusRank[b.chair_status] ?? 3);
    if (statusDelta !== 0) return statusDelta;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });
}
