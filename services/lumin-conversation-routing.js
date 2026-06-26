/**
 * SYNOPSIS: Conversation vs display routing — personal talk never hits queue display theater.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { isFounderPersonalLifeIntent } from './founder-life-admin-intent.js';
import { stripChairDoPrefix } from './lumin-chair-system-actions.js';
import { isBuildRequest } from './chair-intent-signals.js';
import { isRepairContinuationIntent } from './builder-instruction-target.js';

const CONVERSATION_MARKERS = /\b(should i|could i|would i|help me|how do i|what do you think|talk to me|worried|feel like|am i connected|quick check|tell me about|any advice)\b/i;

/** Display intent — "receipt" alone must not hijack build orders (e.g. "Receipt the change"). */
const DISPLAY_MARKERS = /\b(show|display|view)\b|\b(status|queue|jobs|graph|chart|summary|blocker)\b|\b(how many|list jobs|what is the queue)\b|\breceipts?\b(?!\s+the\s+(change|fix|update|patch))/i;

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
  if (isBuildRequest(t) || isRepairContinuationIntent(t)) return false;
  if (String(action || '').toLowerCase() !== 'auto') return false;
  if (isConversationTurn(t)) return false;
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
