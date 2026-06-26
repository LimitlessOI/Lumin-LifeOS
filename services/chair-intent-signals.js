/**
 * SYNOPSIS: Chair intent signal helpers — shared by orchestrator and context classifier.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { isFounderShipOrUsabilityIntent } from './founder-chair-intent.js';
import {
  isFounderPersonalLifeIntent,
  isProductBuildChangeVerb,
} from './founder-life-admin-intent.js';

export function isExplicitExecuteCommand(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/^\s*(execute|run|go|ship)\s*[.!]?\s*$/i.test(t)) return true;
  return /\b(execute it|do it now|run it now|ship it|go ahead|make it happen|just do it|execute that|run that|do that now|get it done|execute this)\b/i.test(t);
}

export function isBlueprintExecuteIntent(text = '') {
  const t = String(text || '');
  if (/\b(build|run|execute)\s+(the\s+)?blueprint\b/i.test(t)) return true;
  if (/\bexecute\s+(the\s+)?mission\b/i.test(t)) return true;
  if (/\brun\s+execute[- ]?mission\b/i.test(t)) return true;
  if (/\bexecute\s+PRODUCT-[A-Z0-9-]+\b/i.test(t)) return true;
  return false;
}

export function isPureCounselQuestion(text = '') {
  const t = String(text || '').trim();
  if (!/\?\s*$/.test(t)) return false;
  if (/\b(status|keep going|point b|continue|progress|execute|build|fix|change|lifere|mission|blueprint)\b/i.test(t)) {
    return false;
  }
  return true;
}

/** Founder repair order — must route to build or fail-closed ack, never counsel deflection. */
export function isFounderRepairOrderIntent(text = '') {
  const t = String(text || '').trim();
  if (!t || /^\s*(do|execute|run)\s*:/i.test(t)) return false;
  if (/\bmake that change\b/i.test(t)) return true;
  if (/\bfix the fact that\b/i.test(t)) return true;
  if (/\bdon'?t tell me (what|about|the)\b/i.test(t)) return true;
  if (/\b(you'?re|you are) supposed to (fix|make|do|repair)\b/i.test(t)) return true;
  if (/\bdirect connection\b/i.test(t) && /\b(repair|fix|change|make)\b/i.test(t)) return true;
  if (/\b(tell you to|you to) (fix|repair|make)\b/i.test(t)) return true;
  if (/\bmake that change\b.*\bwhen I say\b/i.test(t)) return true;
  return false;
}

export function isBuildRequest(text) {
  if (isFounderPersonalLifeIntent(text)) return false;
  if (isBlueprintExecuteIntent(text)) return false;
  const t = String(text || '');
  if (/\b(what changed|tell me what changed|show me what changed|what is the|what are the|how many|status of|queue status)\b/i.test(t)
    && !/\b(change|fix|make|update|set)\b.*\b(color|ui|css|response|reply|bubble)\b/i.test(t)) {
    return false;
  }
  if (/\b(should be|needs to be|want.*(yellow|blue|red|green|color))\b/i.test(t)
    && /\b(response|reply|bubble|assistant|message|color|background)\b/i.test(t)) {
    return true;
  }
  return /\b(fix|update|add|remove|delete|create|make|build|improve|edit|modify|resize|increase|decrease|enable|disable|install|configure|rename|move|replace|set|reset|adjust|implement|wire|connect|upgrade|rewrite|refactor)\b/i.test(t)
    || isProductBuildChangeVerb(t)
    || isFounderShipOrUsabilityIntent(t);
}
