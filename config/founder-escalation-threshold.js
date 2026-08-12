/**
 * SYNOPSIS: The Founder Escalation Threshold — the closed set of conditions under
 * which a question may reach the founder, and the inverse rule that uncertainty
 * never qualifies.
 *
 * Chair, 2026-08-11, after the loop put two implementation questions in front of
 * the founder (which dependency-cycle repair to pick, and how to define seven
 * database schemas):
 *
 *   "Right now it's effectively using you as its missing reasoning layer. That's
 *    exactly what the Conductor/Architect/Builder/Sentry structure is supposed to
 *    eliminate."
 *
 *   "What you want is not 'fewer questions.' You want decision compression: the
 *    organization handles 100 internal uncertainties and brings you one question
 *    only when your unique authority is actually required."
 *
 * The failure this prevents is subtle because it looks like diligence. Asking the
 * founder is always defensible, never wrong, and costs the asker nothing — which
 * is exactly why it becomes the default and why it has to be mechanically
 * expensive instead. A question that does not meet a named criterion below is not
 * a founder question; it is unfinished work, and the gate routes it back to the
 * office that owes the answer.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * The only reasons a question may reach the founder. Closed set: a question that
 * cannot name its criterion cannot be asked.
 */
export const ESCALATION_CRITERION = Object.freeze({
  CHANGES_FOUNDER_INTENT: 'changes_founder_intent_or_mission',
  CHANGES_CONSTITUTIONAL_POLICY: 'creates_or_changes_constitutional_policy',
  CHANGES_USER_RIGHTS: 'materially_changes_user_rights_privacy_ownership_safety_or_consent',
  COMMITS_RESOURCES: 'commits_money_or_time_beyond_delegated_authority',
  IRREVERSIBLE_ARCHITECTURE: 'creates_major_irreversible_architectural_commitment',
  OFFICES_CANNOT_AGREE: 'required_offices_cannot_reach_consensus',
  MATERIALLY_DIFFERENT_HUMAN_OUTCOMES: 'multiple_valid_outcomes_with_materially_different_human_or_business_consequences',
});

/**
 * Reasons that are explicitly NOT sufficient, named so they can be refused by
 * name rather than argued about. Every one of these was, in some form, the actual
 * basis of a question the loop asked the founder.
 */
export const INSUFFICIENT_ESCALATION_REASON = Object.freeze({
  UNCERTAINTY: 'the system is uncertain',
  MULTIPLE_OPTIONS: 'more than one option exists',
  MISSING_SPECIFICATION: 'the source document did not specify it',
  IMPLEMENTATION_DETAIL: 'it is a schema, signature, ordering or naming choice',
  WANTS_CONFIRMATION: 'the office wants its own reasoning confirmed',
  RISK_AVERSION: 'asking is safer for the asker than deciding',
});

/**
 * Concepts that make a decision policy-bearing rather than implementation detail.
 * The Chair's own example is the test case: "Option A means users own and can
 * export this data; Option B means we retain it as proprietary intelligence" is a
 * founder decision, while the column list that implements either one is not.
 */
export const POLICY_BEARING_CONCEPTS = Object.freeze({
  ownership: ['own', 'ownership', 'export', 'portability', 'proprietary'],
  privacy: ['pii', 'personal', 'private', 'sensitive', 'confidential', 'medical', 'financial_account'],
  retention: ['retention', 'delete', 'deletion', 'purge', 'forget', 'expiry_policy', 'archive_forever'],
  consent: ['consent', 'opt_in', 'opt_out', 'permission_granted_by_user', 'share_with_third_party'],
  safety: ['safety', 'harm', 'irreversible_action', 'spend_without_approval'],
  economics: ['price', 'pricing', 'billing', 'revenue', 'commission', 'cost_to_user'],
  identity: ['identity_of_record', 'legal_name', 'ssn', 'government_id'],
});

/**
 * True when a subject encodes founder policy rather than implementation detail.
 * Deliberately generous about what counts as policy: a false positive costs one
 * founder question, a false negative silently commits his product to a position
 * he never took.
 */
export function policyBearing(subject) {
  const text = JSON.stringify(subject ?? '').toLowerCase();
  const hits = [];
  for (const [concept, tokens] of Object.entries(POLICY_BEARING_CONCEPTS)) {
    if (tokens.some((t) => text.includes(t))) hits.push(concept);
  }
  return { policy_bearing: hits.length > 0, concepts: hits };
}

/**
 * The gate. A question must carry a criterion from the closed set AND the evidence
 * for it; anything else is returned to the office that must resolve it.
 */
export function mayEscalateToFounder(question) {
  const criterion = question?.escalation_criterion;
  const known = Object.values(ESCALATION_CRITERION).includes(criterion);

  if (!criterion) {
    return {
      allowed: false,
      reason: 'NO_CRITERION_NAMED',
      detail:
        'the question names no escalation criterion, so it is unfinished work rather than a founder decision',
      route_back_to: question?.owning_office || 'architect',
    };
  }
  if (!known) {
    return {
      allowed: false,
      reason: 'UNKNOWN_CRITERION',
      detail: `\`${criterion}\` is not one of the ${Object.keys(ESCALATION_CRITERION).length} lawful criteria`,
      route_back_to: question?.owning_office || 'architect',
    };
  }
  if (!question?.criterion_evidence) {
    return {
      allowed: false,
      reason: 'CRITERION_WITHOUT_EVIDENCE',
      detail: `the question claims \`${criterion}\` but shows nothing supporting it — naming a criterion cannot be the way around the gate`,
      route_back_to: question?.owning_office || 'architect',
    };
  }
  // Consensus failure is the one criterion the offices cannot self-certify: it
  // requires evidence that they actually tried and recorded their positions.
  if (criterion === ESCALATION_CRITERION.OFFICES_CANNOT_AGREE && !Array.isArray(question?.office_positions)) {
    return {
      allowed: false,
      reason: 'CONSENSUS_FAILURE_UNPROVEN',
      detail:
        'a deadlock claim must carry each office\'s recorded position; without them this is an unattempted decision, not a deadlock',
      route_back_to: 'conductor',
    };
  }

  return { allowed: true, criterion, evidence: question.criterion_evidence };
}

/**
 * Amendment, Chair-directed and founder-endorsed 2026-08-11: the Architect MAY
 * specify implementation detail that the source document left unspecified —
 * schemas, signatures, ordering, naming — provided Builder confirms
 * manufacturability, Sentry confirms the data and safety implications, and
 * Conductor integrates. What the Architect may NOT do is settle policy.
 *
 * This narrows the earlier blanket no-invention rule rather than repealing it.
 * The original rule existed because a builder inventing a schema mid-build hides
 * a decision nobody made; that danger is real and unchanged for anything
 * policy-bearing. But applying it to every unspecified column turned the founder
 * into the system's reasoning layer, which is a worse failure than the one it
 * prevented: "You should not be designing database columns."
 */
export const IMPLEMENTATION_DELEGATION = Object.freeze({
  delegated_to: 'architect',
  requires_consensus_from: Object.freeze(['builder', 'sentry', 'conductor']),
  may_specify: Object.freeze([
    'column names and types for a store whose purpose is specified',
    'function and factory signatures',
    'build ordering and decomposition',
    'internal naming consistent with ratified terminology',
    'reuse of an existing canonical asset in place of a new one',
  ]),
  may_never_specify: Object.freeze([
    'who owns data and whether it can be exported',
    'how long anything is retained or when it is deleted',
    'what a user consents to, or what is shared beyond the system',
    'prices, fees, or anything with a cost to a user',
    'any irreversible architectural commitment',
  ]),
  escalate_instead: 'a policy question in plain language, never a column list',
});
