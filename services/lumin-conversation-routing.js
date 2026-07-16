/**
 * SYNOPSIS: Conversation vs display routing — personal talk never hits queue display theater.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { isFounderPersonalLifeIntent } from './founder-life-admin-intent.js';
import { isBuildRequest, stripChairDoPrefix } from './chair-intent-signals.js';
import { isRepairContinuationIntent } from './builder-instruction-target.js';

const CONVERSATION_MARKERS = /\b(should i|could i|would i|help me|how do i|what do you think|talk to me|worried|feel like|am i connected|quick check|tell me about|any advice)\b/i;
const CONTINUE_TO_PASS_MARKERS = /\b(keep going|continue|advance|do the next|next machine step)\b.*\b(pass|exact blocker|point b|alpha|mission|blueprint)\b/i;
const BUILDEROS_SERVICE_REPAIR_MARKERS = /\b(fix|repair)\b.*\bservices\/[a-zA-Z0-9_-]+\.js\b/i;

/** Display intent — "receipt" alone must not hijack build orders (e.g. "Receipt the change"). */
const DISPLAY_MARKERS = /\b(show|display|view)\b|\b(status|queue|jobs|graph|chart|summary|blocker)\b|\b(how many|list jobs|what is the queue)\b|\breceipts?\b(?!\s+the\s+(change|fix|update|patch))/i;
const SYSTEM_STATUS_MARKERS = /\b(status|progress|what(?:'s| is) next|receipt scan|blocker)\b/i;
const SYSTEM_STATUS_TARGETS = /\b(mission|blueprint|point b|alpha|lifere|builderos|builder|bos|build|build step|queue|governed|autonomous|never stop|factory|system|step you just started)\b/i;

export function isConversationTurn(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (isFounderPersonalLifeIntent(t)) return true;
  return CONVERSATION_MARKERS.test(t);
}

export function isExplicitDisplayOnlyRequest(text = '', action = 'auto') {
  if (String(action || '').toLowerCase() === 'display') return true;
  if (String(action || '').toLowerCase() === 'build') return false;
  const t = String(text || '').trim();
  if (stripChairDoPrefix(t).forcedExecute) return false;
  if (isBuildRequest(t) || isRepairContinuationIntent(t) || BUILDEROS_SERVICE_REPAIR_MARKERS.test(t)) return false;
  if (CONTINUE_TO_PASS_MARKERS.test(t)) return false;
  if (String(action || '').toLowerCase() !== 'auto') return false;
  if (isConversationTurn(t)) return false;
  if (SYSTEM_STATUS_MARKERS.test(t) && SYSTEM_STATUS_TARGETS.test(t)) return false;
  return DISPLAY_MARKERS.test(t);
}

export function coerceDisplayMisrouteToChair(text = '', chairContext = {}, opts = {}) {
  if (opts.explicitAction === 'display' || opts.shouldDisplayOnly) return chairContext;
  if (chairContext.channel !== 'display') return chairContext;
  if (!isConversationTurn(text)) return chairContext;
  return {
    ...chairContext,
    channel: 'chair',
    domain: isFounderPersonalLifeIntent(text) ? 'personal_life' : 'conversation',
    personal_search: true,
    confidence: Math.max(chairContext.confidence || 0, 0.85),
  };
}

export function auditLuminConversationRoutingWiring() {
  const checks = [];
  function add(id, ok, detail) {
    checks.push({ id, ok: Boolean(ok), detail: ok ? detail || 'PASS' : detail });
  }

  add('CONV-01', typeof isConversationTurn === 'function', 'isConversationTurn exported');
  add('CONV-02', isConversationTurn('should I get an oil change this week?'), 'oil change is conversation');
  add('CONV-03', !isExplicitDisplayOnlyRequest('should I get an oil change this week?', 'auto'), 'oil change not display-only');
  add('CONV-04', isExplicitDisplayOnlyRequest('display queue status', 'auto'), 'queue status is display');
  add('CONV-04b', !isExplicitDisplayOnlyRequest('keep going until pass or exact blocker', 'auto'), 'continue-to-pass is not display');
  add(
    'CONV-05',
    coerceDisplayMisrouteToChair('should I get an oil change?', { channel: 'display' }).channel === 'chair',
    'display misroute coerced to chair',
  );

  return {
    schema: 'lumin_conversation_routing_audit_v1',
    checks,
    ok: checks.every((c) => c.ok),
  };
}
