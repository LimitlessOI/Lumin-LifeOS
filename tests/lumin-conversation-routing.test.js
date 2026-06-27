/**
 * SYNOPSIS: Conversation routing — personal talk never display theater.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isConversationTurn,
  isExplicitDisplayOnlyRequest,
  coerceDisplayMisrouteToChair,
  auditLuminConversationRoutingWiring,
} from '../services/lumin-conversation-routing.js';
import { resolveChairContext } from '../services/chair-context-classifier.js';

test('oil change is conversation not display', () => {
  const text = 'should I get an oil change this week?';
  assert.equal(isConversationTurn(text), true);
  assert.equal(isExplicitDisplayOnlyRequest(text, 'auto'), false);
  const ctx = resolveChairContext(text, { shouldDisplayOnly: true, explicitAction: 'auto' });
  assert.equal(ctx.channel, 'chair');
  assert.equal(ctx.domain, 'personal_life');
});

test('queue status stays display', () => {
  const text = 'display queue status';
  assert.equal(isExplicitDisplayOnlyRequest(text, 'auto'), true);
  const ctx = resolveChairContext(text, { shouldDisplayOnly: true, explicitAction: 'auto' });
  assert.equal(ctx.channel, 'display');
});

test('blueprint status follow-up is not trapped in display-only routing', () => {
  const text = 'status on the blueprint step you just started';
  assert.equal(isExplicitDisplayOnlyRequest(text, 'auto'), false);
});

test('do: build with receipt word is not display-only', () => {
  const text = "do: fix voice send in public/overlay/lifeos-app.html — Receipt the change when send it works";
  assert.equal(isExplicitDisplayOnlyRequest(text, 'auto'), false);
});

test('audit wiring passes', () => {
  assert.equal(auditLuminConversationRoutingWiring().ok, true);
});
