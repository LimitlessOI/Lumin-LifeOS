/**
 * SYNOPSIS: Parse a founder's plain-language usability verdict from chat.
 * Conservative by design — a false positive fakes Point B completion, the exact
 * failure mode the founder distrusts. Only clearly affirmative or clearly
 * negative usability sign-offs match; anything ambiguous returns null so the
 * Chair just converses.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { loadBpPriority } from './bp-priority-queue.js';
import { getFounderGatedMissions } from './builder-mission-selection.js';
import { loadPointBTarget } from './point-b-target-lite.js';

const AFFIRM = /\b(works?|working|worked|it'?s good|looks good|good to go|ship it|sign(?:ed)? off|approve[d]?|confirm(?:ed)?|passes?|usable|solid|nailed it|perfect|great job|love it)\b/i;
// Global so we can strip negated phrases before testing for a clean affirmative.
const NEGATE = /\b(does ?n'?t work|not working|doesn'?t|broken|broke|fail(?:ed|s|ing)?|bug|error|can'?t|cannot|won'?t|no good|not usable|still (?:broken|down))\b/gi;
const QUESTION = /\?\s*$|^\s*(is|are|does|do|can|could|would|should|what|why|how|when|where|who)\b/i;
const BUILD = /\b(build|add|create|make|fix|change|update|deploy|do:)\b/i;

/**
 * @returns {{ pass: boolean } | null}
 */
export function parseFounderUsabilityVerdict(text = '') {
  const t = String(text || '').trim();
  if (!t || t.length < 4) return null;
  // Questions and build/change requests are never verdicts.
  if (QUESTION.test(t)) return null;

  // Strip negated phrases ("doesn't work", "fails") so bare "work" inside them
  // isn't misread as an affirmative; what remains is only a clean positive.
  const stripped = t.replace(NEGATE, ' ');
  const negative = stripped !== t;
  const affirmative = AFFIRM.test(stripped);

  if (BUILD.test(t) && !affirmative) return null;
  if (negative && !affirmative) return { pass: false };
  if (affirmative && !negative) return { pass: true };
  // Mixed or neither → ambiguous, do not record.
  return null;
}

/**
 * Missions that are technically done and only awaiting the founder's verdict.
 * @returns {Array<object>}
 */
export function loadFounderGatedMissions({ root } = {}) {
  let bp;
  try {
    bp = loadBpPriority(root ? { root } : {});
  } catch {
    return [];
  }
  return getFounderGatedMissions(bp.items || [], { pointBTarget: loadPointBTarget() });
}
