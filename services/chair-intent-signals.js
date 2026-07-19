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

/** Natural-language UI behavior change — infer surface and auto-execute (no repair-order HALT). */
export function isFounderUiBehaviorChangeRequest(text = '') {
  const t = String(text || '').trim();
  if (!t) return null;
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
 * Emotional / presence counsel — "don't fix me", "be with me".
 * Must never trip the build verb matcher on the word "fix".
 */
export function isCounselPresenceIntent(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/\b(don'?t|do not|never)\s+(try to\s+)?fix(\s+me)?\b/i.test(t)) return true;
  if (/\b(just )?be with me\b/i.test(t)) return true;
  if (/\b(not asking you to fix|don'?t try to solve)\b/i.test(t)) return true;
  if (/\bnobody gets\b/i.test(t) || /\bhow hard this is\b/i.test(t)) return true;
  if (/\bi feel (like|so|alone|lost|scared|tired|heavy)\b/i.test(t) && !isProductBuildChangeVerb(t)) {
    return true;
  }
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