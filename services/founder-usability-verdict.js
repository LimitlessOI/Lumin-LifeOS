/**
 * SYNOPSIS: Parse a founder's plain-language usability verdict from chat.
 * Conservative by design — a false positive fakes Point B completion, the exact
 * failure mode the founder distrusts. Soft status/continuation probes must never
 * record FOUNDER_USABILITY_PASS (Wave 0 item 3 / COMPLETION_VOCABULARY_SSOT §0.5).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { loadBpPriority } from './bp-priority-queue.js';
import { getFounderGatedMissions } from './builder-mission-selection.js';
import { loadPointBTarget } from './point-b-target-lite.js';

const AFFIRM = /\b(works?|working|worked|it'?s good|looks good|good to go|ship it|sign(?:ed)?\soff|approve[d]?|usable|solid|nailed it|perfect|great job|love it)\b/i;
const NEGATE = /\b(does ?n'?t work|not working|doesn'?t|broken|broke|fail(?:ed|s|ing)?|bug|error|can'?t|cannot|won'?t|no good|not usable|still (?:broken|down))\b/gi;
const QUESTION = /\?\s$|^\s*(is|are|does|do|can|could|would|should|what|why|how|when|where|who)\b/i;
const BUILD = /\b(build|add|create|make|fix|change|update|deploy|do:)\b/i;

const STATUS_OR_CONTINUATION = /\b(status|progress|healthz?|blocker|receipt|keep going|continue(?: building)?|until pass|exact blocker|what(?:'s| is) next|autopilot|never[- ]stop|advance|machine path|queue status)\b/i;
const CONTINUE_TO_PASS = /\b(keep going|continue|advance|do the next|next machine step)\b[\s\S]{0,80}\b(pass|exact blocker)\b/i;

// A message DESCRIBING an automated/system test result is NOT the founder personally
// signing off. Without this, an audit/status message that merely mentions the auth
// product and its passing checks (e.g. "the login flow passes the SENTRY gate") was
// parsed as FOUNDER_PASS — the exact false Point-B completion this file warns against.
const THIRD_PERSON_TEST_REPORT = /\b(sentry|layer\s*[ab]\b|credentialed|gate (?:passes|passed|green|run)|passes the .{0,40}(?:gate|check|walkthrough)|0 findings|zero findings|browser (?:check|gate|walkthrough)|automated (?:test|check)|test (?:run|report|suite)|all layers|findings? (?:feed|count)|readiness (?:gate|check))\b/i;

// First-person cues that the FOUNDER is speaking from their own experience. A PASS
// verdict now requires either an unambiguous imperative sign-off (ship it / approve /
// sign off / good to go) or a first-person experiential statement — not a third-person
// description that happens to contain a feature noun.
const FIRST_PERSON = /\b(i|i'?ve|i'?m|we|we'?ve|my|me)\b/i;
const IMPERATIVE_SIGNOFF = /\b(sign(?:ed)?\soff|approve[d]?|good to go|ship it)\b/i;

// Genuine usability-experience context — the founder actually USED it. Feature nouns
// alone ("auth", "login", "register") are NOT sign-off signals; they appear in any
// message about the product. Only first-person experience / explicit sign-off counts.
const USABILITY_CONTEXT = /\b(sign(?:ed)?\soff|approve[d]?|good to go|ship it|usable|i tested|(?:i )?signed up|(?:i )?logged in|for me|i tried|works for me|usability)\b/i;

/**
 * Soft status / continuation probes must never be treated as usability sign-off.
 * @returns {boolean}
 */
export function isSoftStatusOrContinuationProbe(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (CONTINUE_TO_PASS.test(t)) return true;
  if (STATUS_OR_CONTINUATION.test(t)) return true;
  return false;
}

/**
 * Affirmative usability needs explicit sign-off / test context — not bare "worked".
 * @returns {boolean}
 */
export function hasExplicitUsabilityContext(text = '') {
  return USABILITY_CONTEXT.test(String(text || ''));
}

/**
 * @returns {{ pass: boolean } | null}
 */
export function parseFounderUsabilityVerdict(text = '') {
  const t = String(text || '').trim();
  if (!t || t.length < 4) return null;
  // Any embedded question mark → this is a counsel/status question, never a sign-off.
  // False PASS fakes Point B; conservative wins (COMPLETION_VOCABULARY_SSOT §0.5).
  if (QUESTION.test(t) || t.includes('?')) return null;
  if (isSoftStatusOrContinuationProbe(t)) return null;
  // A description of automated/system test results is not the founder's own verdict.
  if (THIRD_PERSON_TEST_REPORT.test(t)) return null;

  const stripped = t.replace(NEGATE, ' ');
  const negative = stripped !== t;
  const affirmative = AFFIRM.test(stripped);

  if (BUILD.test(t) && !affirmative) return null;
  if (negative && !affirmative) return { pass: false };
  if (affirmative && !negative) {
    if (!hasExplicitUsabilityContext(t)) return null;
    // PASS must be first-person ("I …", "works for me") or an explicit imperative
    // sign-off ("ship it", "approve"). A third-person report cannot be a founder pass.
    if (!IMPERATIVE_SIGNOFF.test(t) && !FIRST_PERSON.test(t)) return null;
    return { pass: true };
  }
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