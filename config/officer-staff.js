/**
 * SYNOPSIS: Officer staffing — every office gets cheap assistants, and the
 * expensive model is spent only on judgment.
 *
 * Founder framing (2026-08-11): each officer "has assistance, cheap assistance
 * that they use to gather information, to do cheap easy things... and then we
 * use what we have model-wise to get things done together."
 *
 * The non-obvious part, and the reason this file leads with T0: **the cheapest
 * assistant is not a small model, it is a deterministic script.** Proven the
 * same night this was written — the enforcement sweep found 145 dormant claims,
 * the invention detector found 14 defects in the frozen Overlay fixture, the
 * reachability graph, the dependency contract and the plan verifier all did
 * real work that would otherwise have been reasoning calls, and all of it cost
 * zero tokens. A script that can answer exactly should never be replaced by a
 * model that can answer approximately.
 *
 * So staffing is a ladder, climbed only when the rung below genuinely cannot
 * answer, and with a FLOOR: some questions may never be answered cheaply no
 * matter how confident the cheap tier sounds (SO-003).
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/** The ladder. Ordered cheapest-first; `rank` is what comparisons use. */
export const STAFF_TIER = Object.freeze({
  DETERMINISTIC: 'deterministic',
  CACHED: 'cached',
  FREE_MODEL: 'free_model',
  CHEAP_MODEL: 'cheap_model',
  STRONG_MODEL: 'strong_model',
});

export const TIER_RANK = Object.freeze({
  [STAFF_TIER.DETERMINISTIC]: 0,
  [STAFF_TIER.CACHED]: 1,
  [STAFF_TIER.FREE_MODEL]: 2,
  [STAFF_TIER.CHEAP_MODEL]: 3,
  [STAFF_TIER.STRONG_MODEL]: 4,
});

export const TIER_DESCRIPTION = Object.freeze({
  [STAFF_TIER.DETERMINISTIC]:
    'A script. Exact, instant, zero tokens, and auditable by anyone who reads it. The default assistant for any question with a decidable answer.',
  [STAFF_TIER.CACHED]:
    'An answer already paid for. services/response-cache.js exact-hash and semantic near-match, plus template replay once TemplateStore exists.',
  [STAFF_TIER.FREE_MODEL]:
    'A working free provider. Gemini, Groq, Mistral, DeepSeek and Cerebras were all verified live and $0 on 2026-08-11 — this rung is real capacity, not a hypothetical.',
  [STAFF_TIER.CHEAP_MODEL]: 'A paid small model. Used when free capacity is exhausted or rate-limited.',
  [STAFF_TIER.STRONG_MODEL]: 'Reserved for judgment. Scarce by budget and by design.',
});

/**
 * What a question IS determines who may answer it. These are task classes, not
 * topics: the same subject can be a lookup in one breath and a judgment in the
 * next, and the tier follows the shape of the question rather than its area.
 */
export const TASK_CLASS = Object.freeze({
  /** Decidable from files, schemas or the graph. A script should do this. */
  LOOKUP: 'lookup',
  /** Reformat, extract, normalise. Shape-preserving. */
  MECHANICAL: 'mechanical',
  /** Summarise or draft where being approximately right is acceptable. */
  DRAFT: 'draft',
  /** Weigh alternatives where being wrong is recoverable. */
  ANALYSIS: 'analysis',
  /** Weigh alternatives where being wrong is expensive or hard to reverse. */
  JUDGMENT: 'judgment',
  /** Check someone else's claim. Must not be the same actor that made it. */
  VERIFICATION: 'verification',
});

/**
 * The floor. A task class may never be served below this tier, regardless of
 * how confident a cheaper rung is. SO-003 exists because a canned or cheap
 * answer to a load-bearing question is not a saving, it is a wrong answer
 * delivered efficiently.
 */
export const TIER_FLOOR = Object.freeze({
  [TASK_CLASS.LOOKUP]: STAFF_TIER.DETERMINISTIC,
  [TASK_CLASS.MECHANICAL]: STAFF_TIER.DETERMINISTIC,
  [TASK_CLASS.DRAFT]: STAFF_TIER.FREE_MODEL,
  [TASK_CLASS.ANALYSIS]: STAFF_TIER.FREE_MODEL,
  [TASK_CLASS.JUDGMENT]: STAFF_TIER.STRONG_MODEL,
  [TASK_CLASS.VERIFICATION]: STAFF_TIER.CHEAP_MODEL,
});

/**
 * Each office and the work its staff may absorb. `judgment_reserved_to_officer`
 * is the line the assistants may not cross: staff gather, the officer decides.
 */
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
      { task: 'critique the captured walkthrough as a client', tier: STAFF_TIER.STRONG_MODEL, note: 'Layer B is judgment; SO-002 requires real UX reasoning, not an endpoint 200.' },
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

/**
 * Where a task should start. Never below its floor, never above it without a
 * reason the caller can name — escalation is an event with a cause, not a mood.
 */
export function startingTier(taskClass) {
  const floor = TIER_FLOOR[taskClass];
  if (!floor) throw new Error(`unknown_task_class:${taskClass}`);
  return floor;
}

export function isTierPermitted(taskClass, tier) {
  const floor = TIER_FLOOR[taskClass];
  if (!floor) return { permitted: false, reason: `unknown_task_class:${taskClass}` };
  if (TIER_RANK[tier] === undefined) return { permitted: false, reason: `unknown_tier:${tier}` };
  if (TIER_RANK[tier] < TIER_RANK[floor]) {
    return { permitted: false, reason: 'below_floor', floor, requested: tier };
  }
  return { permitted: true, floor, requested: tier };
}

/**
 * Escalate one rung, with the cause recorded. A cheap tier that cannot answer
 * is useful information — it is not a failure, and it must not be silent.
 */
export function escalate(currentTier, cause) {
  const order = Object.values(STAFF_TIER).sort((a, b) => TIER_RANK[a] - TIER_RANK[b]);
  const idx = order.indexOf(currentTier);
  if (idx === -1) throw new Error(`unknown_tier:${currentTier}`);
  if (idx === order.length - 1) {
    return { tier: currentTier, escalated: false, reason: 'already_at_strongest', cause };
  }
  if (!cause) throw new Error('escalation_requires_a_cause');
  return { tier: order[idx + 1], escalated: true, cause };
}

/** Channels whose answers are load-bearing and may never be served cheaply. */
export const FLOOR_PROTECTED_CHANNELS = Object.freeze(['chair', 'counsel', 'lumin', 'life_admin']);
