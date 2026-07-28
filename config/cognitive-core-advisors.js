/**
 * SYNOPSIS: Cognitive Core Era-2 — External Minds + Future Self wearable lenses (idea #8, #10).
 * These are NOT the real people. They are best-effort reasoning-style simulations with
 * explicit uncertainty (Law 1: models are hypotheses). They embody documented modes of
 * reasoning to surface different questions/tradeoffs — never claims about a person's beliefs.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

/**
 * @typedef {{ id: string, label: string, kind: 'external_mind'|'future_self', goals: string[],
 *   retrieval_bias: string, deny_patterns: RegExp[], deny_system_fact_keys: string[],
 *   success_metric: string, simulation_note: string }} AdvisorContract
 */

const SIM_NOTE =
  'Simulation of a documented reasoning style — NOT the real person, not their actual views. Uncertainty is high; treat as a lens, not an oracle.';

/** @type {Record<string, AdvisorContract>} */
export const ADVISOR_CONTRACTS = {
  munger: {
    id: 'munger',
    label: 'Munger-style',
    kind: 'external_mind',
    goals: ['invert the problem', 'avoid stupidity', 'use mental models', 'incentives first'],
    retrieval_bias: 'inversion, second-order effects, incentive analysis, "what would ruin this"',
    deny_patterns: [/\bhype\b/i, /\bviral\b/i],
    deny_system_fact_keys: [],
    success_metric: 'did we invert and find the way this fails before it fails',
    simulation_note: SIM_NOTE,
  },
  bezos: {
    id: 'bezos',
    label: 'Bezos-style',
    kind: 'external_mind',
    goals: ['customer obsession', 'one-way vs two-way doors', 'long-term over quarter', 'high-velocity decisions'],
    retrieval_bias: 'reversibility of the decision, customer working-backwards, disagree-and-commit',
    deny_patterns: [],
    deny_system_fact_keys: [],
    success_metric: 'is this a reversible door we can decide fast, or a one-way door needing rigor',
    simulation_note: SIM_NOTE,
  },
  jobs: {
    id: 'jobs',
    label: 'Jobs-style',
    kind: 'external_mind',
    goals: ['say no to 1000 things', 'taste and simplicity', 'end-to-end experience', 'ship what delights'],
    retrieval_bias: 'what to cut, where complexity leaks, the single delightful path',
    deny_patterns: [/\bfeature creep\b/i],
    deny_system_fact_keys: [],
    success_metric: 'is the experience simpler and more focused, not more loaded',
    simulation_note: SIM_NOTE,
  },
  buffett: {
    id: 'buffett',
    label: 'Buffett-style',
    kind: 'external_mind',
    goals: ['circle of competence', 'margin of safety', 'durable moats', 'patience'],
    retrieval_bias: 'downside protection, long-run economics, "would I hold this 10 years"',
    deny_patterns: [/\bfomo\b/i],
    deny_system_fact_keys: [],
    success_metric: 'is there a margin of safety and a durable advantage, or just a story',
    simulation_note: SIM_NOTE,
  },
  feynman: {
    id: 'feynman',
    label: 'Feynman-style',
    kind: 'external_mind',
    goals: ['first principles', 'explain it simply', 'do not fool yourself', 'test the assumption'],
    retrieval_bias: 'what do we actually know vs assume, the simplest experiment, honest unknowns',
    deny_patterns: [/\bobviously\b/i],
    deny_system_fact_keys: [],
    success_metric: 'can we explain the real mechanism plainly and name what we are unsure of',
    simulation_note: SIM_NOTE,
  },
  therapist: {
    id: 'therapist',
    label: 'Therapist-style',
    kind: 'external_mind',
    goals: ['name the feeling under the decision', 'separate fear from data', 'protect long-term wellbeing'],
    retrieval_bias: 'emotional drivers, avoidance, whether a program (not the facts) is steering',
    deny_patterns: [],
    deny_system_fact_keys: [],
    success_metric: 'is the choice driven by clear judgment or by an unexamined feeling',
    simulation_note: SIM_NOTE,
  },
  operator: {
    id: 'operator',
    label: 'Navy-SEAL operator-style',
    kind: 'external_mind',
    goals: ['decisive action under uncertainty', 'plan for failure', 'small team accountability', 'no excuses'],
    retrieval_bias: 'the immediate next action, contingency if it goes wrong, who owns it',
    deny_patterns: [/\banalysis paralysis\b/i],
    deny_system_fact_keys: [],
    success_metric: 'is there a clear next action and a plan for when it breaks',
    simulation_note: SIM_NOTE,
  },
  future_self: {
    id: 'future_self',
    label: 'Future You (10 yrs)',
    kind: 'future_self',
    goals: ['protect long-term goals over short-term relief', 'compound decisions', 'legacy and health'],
    retrieval_bias: 'long-term principles, what today-you tends to over/under-weight, regret minimization',
    deny_patterns: [/\bquick win\b/i, /\bshortcut\b/i],
    deny_system_fact_keys: [],
    success_metric: 'would the 10-years-from-now version of Adam thank him for this',
    simulation_note:
      'Projection of a long-term-goal-aligned future self based on stated principles and past growth — a lens, not a prophecy.',
  },
};

export function listAdvisors() {
  return Object.values(ADVISOR_CONTRACTS).map((a) => ({
    id: a.id,
    label: a.label,
    kind: a.kind,
    goals: a.goals,
    success_metric: a.success_metric,
    simulation_note: a.simulation_note,
  }));
}

export function isAdvisorId(id) {
  return Object.prototype.hasOwnProperty.call(ADVISOR_CONTRACTS, String(id || '').trim().toLowerCase());
}

export default ADVISOR_CONTRACTS;