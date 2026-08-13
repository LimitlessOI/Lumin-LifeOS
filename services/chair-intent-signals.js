/**
 * SYNOPSIS: Chair intent signal helpers — shared by orchestrator and context classifier.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { isFounderShipOrUsabilityIntent } from './founder-chair-intent.js';
import {
  isFounderPersonalLifeIntent,
  isProductBuildChangeVerb,
} from './founder-life-admin-intent.js';

const CHAIR_DO_PREFIX = /^\s*(do|execute|run)\s*:\s*/i;

// Centralized event emitter for intent signals
const intentEventEmitter = new EventTarget();

/**
 * Emits a custom intent signal event.
 * @param {string} signalType The type of intent signal (e.g., 'founder_intent_classified', 'founder_intent_clarification_required').
 * @param {object} detail Custom data associated with the signal.
 */
export function emitIntentSignal(signalType, detail) {
  const event = new CustomEvent(signalType, { detail });
  intentEventEmitter.dispatchEvent(event);
}

/**
 * Registers a listener for a specific intent signal.
 * @param {string} signalType The type of intent signal to listen for.
 * @param {function} handler The callback function to execute when the signal is received.
 */
export function onIntentSignal(signalType, handler) {
  intentEventEmitter.addEventListener(signalType, handler);
}

/** Strip a leading "do:/execute:/run:" prefix and flag it as a forced-execute order. */
export function stripChairDoPrefix(text = '') {
  const raw = String(text || '').trim();
  if (!CHAIR_DO_PREFIX.test(raw)) {
    return { text: raw, forcedExecute: false };
  }
  return { text: raw.replace(CHAIR_DO_PREFIX, '').trim(), forcedExecute: true };
}

export function isExplicitExecuteCommand(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/^\s*(execute|run|go|ship)\s*[.!]?\s$/i.test(t)) return true;
  return /\b(execute it|do it now|run it now|ship it|go ahead|make it happen|just do it|execute that|run that|do that now|get it done|execute this)\b/i.test(t);
}

export function isBlueprintExecuteIntent(text = '') {
  const t = String(text || '');
  if (/\b(build|run|execute)\s+(the\s+)?blueprint\b/i.test(t)) return true;
  if (/\b(build|run|execute)\s+the\s+next\s+blueprint\s+step\b/i.test(t)) return true;
  if (/\bnext\b.*\bblueprint\b.*\bstep\b/i.test(t)) return true;
  if (/\bbuild\b.*\bnext\b.*\bstep\b.*\bPRODUCT-[A-Z0-9-]+\b/i.test(t)) return true;
  if (/\bexecute\s+(the\s+)?mission\b/i.test(t)) return true;
  if (/\brun\s+execute[- ]?mission\b/i.test(t)) return true;
  if (/\bexecute\s+PRODUCT-[A-Z0-9-]+\b/i.test(t)) return true;
  return false;
}

export function isPureCounselQuestion(text = '') {
  const t = String(text || '').trim();
  if (!/\?\s$/.test(t)) return false;
  if (/\b(status|keep going|point b|continue|progress|execute|build|fix|change|lifere|mission|blueprint)\b/i.test(t)) {
    return false;
  }
  return true;
}

/** Founder meta-repair order — governance probe, not a normal product change request. */
export function isFounderRepairOrderIntent(text = '') {
  const t = String(text || '').trim();
  if (!t || /^\s*(do|execute|run)\s*:/i.test(t)) return false;
  // Normal product asks ("I want you to make it so Enter sends…") are builds, not repair probes.
  if (/\b(want|need|like|please)\b.*\b(you to )?make (it|this) (so|where|when)\b/i.test(t)) return false;
  if (/\b(hit|press|when I) (enter|return)\b/i.test(t) && /\b(send|message|chat|box|field|textarea)\b/i.test(t)) {
    return false;
  }
  if (/\bmake that change\b/i.test(t)) return true;
  if (/\bfix the fact that\b/i.test(t)) return true;
  if (/\bdon'?t tell me (what|about|the)\b/i.test(t)) return true;
  if (/\b(you'?re|you are) supposed to (fix|make|do|repair)\b/i.test(t)) return true;
  if (/\bdirect connection\b/i.test(t) && /\b(repair|fix|change|make)\b/i.test(t)) return true;
  if (/\b(i told you to|tell you to) (fix|repair)\b/i.test(t)) return true;
  if (/\bmake that change\b.*\bwhen I say\b/i.test(t)) return true;
  return false;
}

// Real bug found live 2026-08-11, same class as builder-instruction-target.js's
// isCssOnlyUiFeedback: a real multi-paragraph technical spec (chat/message/
// input are all common words in ANY conversation about the system) could
// false-positive here just as easily as it did there, and get silently
// treated as a tiny "wire Enter-to-send" mechanical patch instead of the
// real request. These wiring orders are always short, direct instructions
// by design ("make Enter send messages in the drawer") -- a real spec is
// inherently longer than that, so length alone is a safe, honest guard.
const WIRING_ORDER_MAX_LENGTH = 300;

/** Natural-language UI behavior change — infer surface and auto-execute (no repair-order HALT). */
export function isFounderUiBehaviorChangeRequest(text = '') {
  const t = String(text || '').trim();
  if (!t) return null;
  if (t.length > WIRING_ORDER_MAX_LENGTH) return null;
  const enterSend = /\b(enter|return key|hit enter|press enter|newline|line break)\b/i.test(t)
    && /\b(send|post|submit|message|chat|box|field|textarea|input|typing|type out|response)\b/i.test(t);
  const shiftEnter = /\bshift\+enter|shift enter\b/i.test(t) && /\b(newline|line break|next line)\b/i.test(t);
  if (!enterSend && !shiftEnter) return null;
  const target = /\b(lumin drawer|lumin-input|lifeos-app|app shell)\b/i.test(t)
    ? 'public/overlay/lifeos-app.html'
    : 'public/overlay/lifeos-dashboard.html';
  return { target_file: target, kind: 'enter_key_send' };
}

/** Explain-only — must stay on counsel/chair, never build_terminal or build_async. */
export function isCounselOnlyBypass(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (!/\b(counsel only|do not run a build|don't run a build|do not run|don't run|without building|without running)\b/i.test(t)) {
    return false;
  }
  return /\b(explain|describe|tell me how|walk me through|how do you|how you|how would you)\b/i.test(t)
    || /\?\s$/.test(t);
}

/** Status question about a prior build — counsel/receipt recall, NOT a new build order. */
export function isBuildStatusQuestion(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/\b(did|has|have|was)\b[\s\S]{0,60}\bbuild\b[\s\S]{0,60}\b(land|commit|ship|deploy|finish|done|succeed|work)\b/i.test(t)) {
    return true;
  }
  if (/\b(what(?:'s| is)|show me|give me)\b[\s\S]{0,40}\b(the )?(sha|commit)\b/i.test(t)) return true;
  if (/\blast (build|commit)\b[\s\S]{0,40}\b(land|sha|status|commit)\b/i.test(t)) return true;
  return false;
}

/**
 * Emotional / presence counsel — "don't fix me", "be with me", anger/vent.
 * Must never trip the build verb matcher on the word "fix".
 */
export function isCounselPresenceIntent(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/\b(don'?t|do not|never)\s+(try to\s+)?fix(\s+me)?\b/i.test(t)) return true;
  if (/\b(just )?be with me\b/i.test(t)) return true;
  if (/\b(not asking you to fix|don'?t try to solve|don'?t pitch|no next steps)\b/i.test(t)) return true;
  if (/\bnobody gets\b/i.test(t) || /\bhow hard this is\b/i.test(t)) return true;
  if (/\bi('m| am) (pissed|angry|furious|exhausted|burned out|burnt out)\b/i.test(t)) return true;
  if (/\b(everything feels stuck|tired of pretending|i'?m tired of pretending)\b/i.test(t)) return true;
  if (/\bi feel (like|so|alone|lost|scared|tired|heavy)\b/i.test(t) && !isProductBuildChangeVerb(t)) {
    return true;
  }
  return false;
}

/**
 * Determines if the given text likely indicates a 'workflow-conten' lane intent.
 * This intent focuses on content-related tasks or workflows, often involving creation,
 * modification, or management of text, data, or media within a structured process.
 * It's distinct from direct UI/product changes or personal life admin.
 * @param {string} text The input text from the founder.
 * @returns {boolean} True if the text suggests a workflow-content intent, false otherwise.
 */
export function isWorkflowContentIntent(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;

  // Keywords for content creation/management
  if (/\b(write|draft|compose|generate|create|edit|revise|proofread|publish)\b.*\b(post|article|report|summary|email|doc|document|content|message|blog|script)\b/i.test(t)) return true;
  // Keywords for data/information handling within a workflow
  if (/\b(extract|analyze|summarize|categorize|organize|process|manage|update)\b.*\b(data|information|records|files|tasks|workflow|list)\b/i.test(t)) return true;
  // Mentions of specific content types or platforms in a workflow context
  if (/\b(social media|newsletter|marketing campaign|jira ticket|confluence page|github issue)\b/i.test(t) && /\b(prepare|update|review|track|assign)\b/i.test(t)) return true;
  // General workflow-related verbs
  if (/\b(prepare|schedule|coordinate|automate|streamline|optimize|document)\b.*\b(workflow|process|task)\b/i.test(t)) return true;

  // Exclude common build/repair/counsel terms if they appear without a strong content context
  if (isBuildRequest(t) && !/\b(write|draft|compose|generate|content)\b/i.test(t)) return false;
  if (isFounderRepairOrderIntent(t)) return false;
  if (isCounselOnlyBypass(t)) return false;
  if (isBuildStatusQuestion(t)) return false;
  if (isCounselPresenceIntent(t)) return false;
  if (isFounderPersonalLifeIntent(t)) return false;
  if (isFounderShipOrUsabilityIntent(t) && !/\b(content|message|post)\b/i.test(t)) return false;

  return false;
}

export function isBuildRequest(text) {
  const stripped = stripChairDoPrefix(text);
  const t = String(stripped.text || '');
  if (isFounderPersonalLifeIntent(t)) return false;
  if (isBuildStatusQuestion(t)) return false;
  if (isCounselPresenceIntent(t)) return false;
  if (isBlueprintExecuteIntent(t)) return false;
  if (isCounselOnlyBypass(t)) return false;
  if (isWorkflowContentIntent(t)) return false; // Exclude if it's primarily a workflow-content request
  // Cognitive Core: "Should I X or Y / make … first?" is judgment, not a build order.
  if (/\b(should i|should we)\b/i.test(t) && /\bor\b/i.test(t)) return false;
  if (/\b(decide|decision|choose between|trade ?off)\b/i.test(t) && /\?/i.test(t)) return false;
  if (/\b(intake blueprint|intake_blueprint|mos-p1)\b/i.test(t)) return false;
  if (/\b(social\smedia\sos|socialmediaos|smos)\b/i.test(t) && /\b(intake|blueprint|a to z|a-to-z)\b/i.test(t)) return false;
  if (/\b(counsel only|do not run|don't run|without building|without running|explain how you|walk me through)\b/i.test(t)) {
    return false;
  }
  if (/\b(what changed|tell me what changed|show me what changed|what is the|what are the|how many|status of|queue status)\b/i.test(t)
    && !/\b(change|fix|make|update|set)\b.*\b(color|ui|css|response|reply|bubble)\b/i.test(t)) {
    return false;
  }
  if (/\b(should be|needs to be|want.*(yellow|blue|red|green|color|faint|lighter|darker))\b/i.test(t)
    && /\b(response|reply|bubble|assistant|message|color|background|down there|here)\b/i.test(t)) {
    return true;
  }
  return /\b(fix|update|add|remove|delete|create|make|build|improve|edit|modify|resize|increase|decrease|enable|disable|install|configure|rename|move|replace|set|reset|adjust|implement|wire|connect|upgrade|rewrite|refactor)\b/i.test(t)
    || isProductBuildChangeVerb(t)
    || isFounderShipOrUsabilityIntent(t)
    || /\b(drawer_direct_build|smos_question)\b/i.test(t);
}

/**
 * Gathers and provides signals that aid in the founder intent classification process.
 * @param {string} text The input text from the founder.
 * @returns {object} An object containing various intent classification signals.
 */
export function getIntentSignals(text = '') {
  const stripped = stripChairDoPrefix(text);
  const cleanedText = stripped.text;

  return {
    forcedExecute: stripped.forcedExecute,
    isExplicitExecuteCommand: isExplicitExecuteCommand(cleanedText),
    isBlueprintExecuteIntent: isBlueprintExecuteIntent(cleanedText),
    isPureCounselQuestion: isPureCounselQuestion(cleanedText),
    isFounderRepairOrderIntent: isFounderRepairOrderIntent(cleanedText),
    isFounderUiBehaviorChangeRequest: isFounderUiBehaviorChangeRequest(cleanedText),
    isCounselOnlyBypass: isCounselOnlyBypass(cleanedText),
    isBuildStatusQuestion: isBuildStatusQuestion(cleanedText),
    isCounselPresenceIntent: isCounselPresenceIntent(cleanedText),
    isBuildRequest: isBuildRequest(cleanedText),
    isFounderPersonalLifeIntent: isFounderPersonalLifeIntent(cleanedText),
    isFounderShipOrUsabilityIntent: isFounderShipOrUsabilityIntent(cleanedText),
    isWorkflowContentIntent: isWorkflowContentIntent(cleanedText), // New signal for workflow-content
  };
}