/**
 * SYNOPSIS: Canonical officer staffing boundaries.
 *
 * Governance principle: assistants gather, compute, draft, diagnose and propose;
 * the owning officer retains reserved judgment. Deterministic work comes first.
 * Model work is free-first and capability/evidence-routed under
 * builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json.
 *
 * This file intentionally does NOT maintain a parallel paid/strong-model ladder.
 * Price is not capability. Paid escalation is governed centrally and requires a
 * PAID_ESCALATION_RECEIPT after applicable free candidates are exhausted,
 * unavailable, or proven incapable for the failure class.
 *
 * @governance builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json
 * @capabilities builderos-reboot/governance/MODEL_CAPABILITY_CLASSES.json
 */

export const STAFF_TIER = Object.freeze({
  DETERMINISTIC: 'deterministic',
  CACHED: 'cached',
  FREE_MODEL: 'free_model',
  GOVERNED_MODEL: 'governed_model',
});

export const TIER_RANK = Object.freeze({
  [STAFF_TIER.DETERMINISTIC]: 0,
  [STAFF_TIER.CACHED]: 1,
  [STAFF_TIER.FREE_MODEL]: 2,
  [STAFF_TIER.GOVERNED_MODEL]: 3,
});

export const TIER_DESCRIPTION = Object.freeze({
  [STAFF_TIER.DETERMINISTIC]: 'Exact script/tool work. Default whenever the answer is decidable.',
  [STAFF_TIER.CACHED]: 'Previously proven/reusable result when provenance and freshness permit reuse.',
  [STAFF_TIER.FREE_MODEL]: 'Free available model selected by required capability and LifeOS evidence.',
  [STAFF_TIER.GOVERNED_MODEL]: 'Capability-qualified model selected by central routing governance. Paid use, if any, requires PAID_ESCALATION_RECEIPT.',
});

export const TASK_CLASS = Object.freeze({
  LOOKUP: 'lookup',
  MECHANICAL: 'mechanical',
  DRAFT: 'draft',
  ANALYSIS: 'analysis',
  JUDGMENT: 'judgment',
  VERIFICATION: 'verification',
});

/**
 * Minimum staffing mechanism, not a price ladder. Judgment/verification require
 * governed capability selection; they do NOT imply paid models.
 */
export const TIER_FLOOR = Object.freeze({
  [TASK_CLASS.LOOKUP]: STAFF_TIER.DETERMINISTIC,
  [TASK_CLASS.MECHANICAL]: STAFF_TIER.DETERMINISTIC,
  [TASK_CLASS.DRAFT]: STAFF_TIER.FREE_MODEL,
  [TASK_CLASS.ANALYSIS]: STAFF_TIER.FREE_MODEL,
  [TASK_CLASS.JUDGMENT]: STAFF_TIER.GOVERNED_MODEL,
  [TASK_CLASS.VERIFICATION]: STAFF_TIER.GOVERNED_MODEL,
});

export const OFFICER_STAFF = Object.freeze({
  conductor: Object.freeze({
    judgment_reserved_to_officer: ['sequencing', 'decomposition', 'work assignment', 'priority'],
    staff_may: Object.freeze([
      { task: 'read the dependency graph and compute waves', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'scripts/manufacturing-plan.mjs' },
      { task: 'detect dependency cycles and collisions', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'scripts/manufacturing-plan.mjs' },
      { task: 'check whether a product is registered for its gates', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'scripts/conductor-resolve-requests.mjs' },
      { task: 'accept a simple SENTRY conclusion without re-solving it', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'config/sentry-repair-handoff.js' },
      { task: 'summarise mission status for a founder update', tier: STAFF_TIER.FREE_MODEL },
    ]),
  }),
  architect: Object.freeze({
    judgment_reserved_to_officer: ['architecture fidelity', 'interface design', 'assembly order correctness'],
    staff_may: Object.freeze([
      { task: 'scan the repository for an existing table before anything is designed', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'scripts/architect-resolve-requests.mjs' },
      { task: 'detect invented schemas, identity mismatches and stale terminology', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'services/blueprint-invention-detector.js' },
      { task: 'find reusable existing capability before new work is proposed', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'scripts/lib/reference-index.mjs' },
      { task: 'draft a specification request for a gap', tier: STAFF_TIER.FREE_MODEL },
    ]),
  }),
  sentry: Object.freeze({
    judgment_reserved_to_officer: ['is this actually done', 'UX adequacy from the client perspective'],
    staff_may: Object.freeze([
      { task: 'run structural HTTP assertions (Layer A)', tier: STAFF_TIER.DETERMINISTIC },
      { task: 'walk the page and capture screenshots', tier: STAFF_TIER.DETERMINISTIC },
      { task: 'check that a claimed mechanism has a real caller', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'scripts/verify-enforcement-truth.mjs' },
      { task: 'critique the captured walkthrough as a client', tier: STAFF_TIER.GOVERNED_MODEL, required_capability: 'AUDITOR', note: 'Layer B requires genuine UX judgment; central routing chooses the cheapest proven-capable available model, free first.' },
      { task: 'classify a finding as send-conclusion, dual-solve, or officer-panel', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'config/sentry-repair-handoff.js' },
    ]),
  }),
  wisdom: Object.freeze({
    judgment_reserved_to_officer: ['long-horizon consequence', 'principle conflicts', 'what we will regret'],
    staff_may: Object.freeze([
      { task: 'retrieve prior decisions and their outcomes', tier: STAFF_TIER.DETERMINISTIC },
      { task: 'find precedent in the decision ledger', tier: STAFF_TIER.CACHED },
      { task: 'assemble the evidence packet for a deliberation', tier: STAFF_TIER.FREE_MODEL },
    ]),
  }),
  efficiency_officer: Object.freeze({
    judgment_reserved_to_officer: ['spend authorisation', 'capacity allocation across factories', 'ROI calls'],
    staff_may: Object.freeze([
      { task: 'read token usage and free-tier remaining', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'services/free-tier-governor.js' },
      { task: 'check live provider health before routing', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'services/provider-key-health.js' },
      { task: 'rank models by observed performance per lens', tier: STAFF_TIER.DETERMINISTIC, implemented_by: 'services/model-capability-ledger.js' },
    ]),
  }),
});

export function startingTier(taskClass) {
  const floor = TIER_FLOOR[taskClass];
  if (!floor) throw new Error(`unknown_task_class:${taskClass}`);
  return floor;
}

export function isTierPermitted(taskClass, tier) {
  const floor = TIER_FLOOR[taskClass];
  if (!floor) return { permitted: false, reason: `unknown_task_class:${taskClass}` };
  if (TIER_RANK[tier] === undefined) return { permitted: false, reason: `unknown_tier:${tier}` };
  if (TIER_RANK[tier] < TIER_RANK[floor]) return { permitted: false, reason: 'below_floor', floor, requested: tier };
  return { permitted: true, floor, requested: tier };
}

/**
 * Local escalation stops at governed model selection. Whether that selection
 * uses a free or paid provider is exclusively decided by the central routing
 * contract; this helper cannot authorize spend.
 */
export function escalate(currentTier, cause) {
  const order = Object.values(STAFF_TIER).sort((a, b) => TIER_RANK[a] - TIER_RANK[b]);
  const idx = order.indexOf(currentTier);
  if (idx === -1) throw new Error(`unknown_tier:${currentTier}`);
  if (idx === order.length - 1) return { tier: currentTier, escalated: false, reason: 'central_routing_required', cause };
  if (!cause) throw new Error('escalation_requires_a_cause');
  return { tier: order[idx + 1], escalated: true, cause };
}

/** Canonical names only. Legacy Chair naming must not be reintroduced here. */
export const FLOOR_PROTECTED_CHANNELS = Object.freeze(['conductor', 'counsel', 'lumin', 'life_admin']);
