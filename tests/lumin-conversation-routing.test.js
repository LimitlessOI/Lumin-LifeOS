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

test('explicit display action skips misroute coercion', () => {
  const text = 'display queue status and recent jobs';
  const ctx = resolveChairContext(text, { shouldDisplayOnly: true, explicitAction: 'display' });
  const coerced = coerceDisplayMisrouteToChair(text, ctx, {
    explicitAction: 'display',
    shouldDisplayOnly: true,
  });
  assert.equal(coerced.channel, 'display');
});

test('shouldSkipInputNormalize preserves display commands', async () => {
  const { shouldSkipInputNormalize } = await import('../services/lumin-chair-system-actions.js');
  assert.equal(
    shouldSkipInputNormalize('display queue status and recent jobs', 'display'),
    true,
  );
});

test('coerceDisplayMisrouteToChair fixes display misroute', () => {
  const fixed = coerceDisplayMisrouteToChair('should I get an oil change?', { channel: 'display' });
  assert.equal(fixed.channel, 'chair');
  assert.equal(fixed.domain, 'personal_life');
});

test('audit wiring passes', () => {
  assert.equal(auditLuminConversationRoutingWiring().ok, true);
});
