/**
 * SYNOPSIS: Era-1 perspective capsule contracts — attention lenses with allow/deny.
 * Era-2 adds external-mind/future-self advisor lenses + outcome-turn detection.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { ADVISOR_CONTRACTS } from './cognitive-core-advisors.js';

export const COMPILER_VERSION = 'era1-v1';
export const WORKING_MEMORY_SLOT_CAP = 20;

/** @typedef {{ id: string, label: string, goals: string[], retrieval_bias: string, deny_patterns: RegExp[], deny_system_fact_keys: string[], success_metric: string }} CapsuleContract */

/** @type {Record<string, CapsuleContract>} */
export const CAPSULE_CONTRACTS = {
  founder: {
    id: 'founder',
    label: 'Founder',
    goals: ['growth', 'Point B progress', 'sovereignty', 'honest shipping'],
    retrieval_bias: 'founder values, long-term bets, mission tradeoffs',
    deny_patterns: [],
    deny_system_fact_keys: [],
    success_metric: 'moves the company without self-deception',
  },
  customer: {
    id: 'customer',
    label: 'Customer',
    goals: ['get value fast', 'feel heard', 'low friction'],
    retrieval_bias: 'user pain, UX friction, time-to-value',
    deny_patterns: [
      /\broadmap\b/i,
      /\bsunk cost\b/i,
      /\bbuild receipt\b/i,
      /\bqueue\b/i,
      /\bgoverned autonomous\b/i,
      /\bpoint b\b/i,
      /\bmachine path\b/i,
      /\bcouncil call failed\b/i,
    ],
    deny_system_fact_keys: [
      'live_builder_status',
      'last_build_receipt',
      'point_b_target',
      'strategic_brief',
    ],
    success_metric: 'would a first-time user feel helped in under a minute',
  },
  engineer: {
    id: 'engineer',
    label: 'Engineer',
    goals: ['correctness', 'risk reduction', 'maintainability'],
    retrieval_bias: 'API risk, lock-in, failure modes, tests',
    deny_patterns: [],
    deny_system_fact_keys: [],
    success_metric: 'smallest correct change with clear failure modes',
  },
  competitor: {
    id: 'competitor',
    label: 'Competitor',
    goals: ['find attack surface', 'exploit complacency'],
    retrieval_bias: 'market alternatives, substitution, kill shots',
    deny_patterns: [/\bour hopes\b/i, /\bi wish\b/i],
    deny_system_fact_keys: ['personal_twin'],
    success_metric: 'how would a sharp rival kill this plan',
  },
  anti_you: {
    id: 'anti_you',
    label: 'Anti-you',
    goals: ['kill the preferred conclusion', 'expose sunk cost and facade'],
    retrieval_bias: 'contradictions, failed approaches, hard truths',
    deny_patterns: [],
    deny_system_fact_keys: [],
    success_metric: 'strongest honest objection to what Adam wants to hear',
  },
};

export const DEFAULT_DECISION_WEAR = ['founder', 'customer', 'anti_you'];

export const DECISION_INTENT_RE =
  /\b(should i|should we|decide|decision|choose|choice|hire|buy|invest|ship|launch|pause|or not|trade ?off|which (one|option)|what would you (do|choose))\b/i;

/** All wearable lenses: Era-1 capsules + Era-2 advisor/future-self minds. */
export const ALL_LENSES = { ...CAPSULE_CONTRACTS, ...ADVISOR_CONTRACTS };

/**
 * @param {string[]} ids
 * @returns {CapsuleContract[]}
 */
export function resolveCapsuleContracts(ids) {
  const out = [];
  const seen = new Set();
  for (const raw of ids || []) {
    const id = String(raw || '').trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    const c = ALL_LENSES[id];
    if (!c) continue;
    seen.add(id);
    out.push(c);
  }
  return out;
}

/**
 * @param {string} text
 * @param {CapsuleContract} capsule
 */
export function suppressTextForCapsule(text, capsule) {
  let t = String(text || '');
  for (const re of capsule.deny_patterns || []) {
    if (re.test(t)) {
      t = t.replace(re, '[suppressed]');
    }
  }
  return t;
}

/**
 * @param {Record<string, unknown>} facts
 * @param {CapsuleContract} capsule
 */
export function suppressSystemFactsForCapsule(facts, capsule) {
  const out = { ...(facts || {}) };
  for (const key of capsule.deny_system_fact_keys || []) {
    if (key in out) delete out[key];
  }
  return out;
}

export const OUTCOME_INTENT_RE =
  /\b(i (went with|chose|picked|decided on|ended up|decided to|did|didn'?t)|we (went with|chose|decided|are going with|ended up)|going with|i'?m going with|ended up (choosing|going|picking)|in the end i|for the record i (chose|went))\b/i;

/**
 * Detect when Adam is reporting the decision he ACTUALLY made (Law 5 fuel).
 * This never infers an outcome — it only fires on explicit self-report so the
 * calibration loop can compare prediction vs reality honestly.
 * @param {string} message
 */
export function detectOutcomeTurn(message) {
  const text = String(message || '');
  const stated = OUTCOME_INTENT_RE.test(text);
  return {
    is_outcome_turn: stated,
    chosen_option: stated ? extractChosenOption(text) : null,
  };
}

/**
 * Best-effort extraction of the option the user says they chose. Heuristic only;
 * the raw text is always preserved as stated_reasons so nothing is fabricated.
 * @param {string} message
 */
export function extractChosenOption(message) {
  const text = String(message || '').trim();
  const m = text.match(
    /\b(?:went with|chose|picked|decided on|going with|ended up (?:choosing|going with|picking)|decided to)\s+(.+?)(?:[.!?]|,| because| since| so that|$)/i,
  );
  if (m && m[1]) return m[1].trim().slice(0, 200);
  return null;
}

/**
 * @param {string} message
 * @param {{ worn?: string[], stakes?: string }} [opts]
 */
export function detectJudgmentTurn(message, opts = {}) {
  const worn = Array.isArray(opts.worn) ? opts.worn.filter(Boolean) : [];
  const hasWear = worn.length > 0;
  const decisionIntent = DECISION_INTENT_RE.test(String(message || ''));
  const highStakes = String(opts.stakes || '').toLowerCase() === 'high';
  return {
    is_judgment_turn: hasWear || decisionIntent || highStakes,
    decision_intent: decisionIntent,
    worn_requested: worn,
    default_wear: hasWear ? worn : (decisionIntent || highStakes ? DEFAULT_DECISION_WEAR : []),
  };
}