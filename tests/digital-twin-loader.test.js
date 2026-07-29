/**
 * SYNOPSIS: Unit tests for digital twin inject loader.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLuminContextLoader, fieldValue } from '../services/lumin-context-loader.js';

test('fieldValue unwraps evidence objects', () => {
  assert.equal(fieldValue({ value: 'America/Los_Angeles' }), 'America/Los_Angeles');
  assert.equal(fieldValue('plain'), 'plain');
});

test('Adam twin loads all required facets and builds inject', async () => {
  const loader = createLuminContextLoader({});
  const twin = await loader.loadFullTwin('adam');
  assert.ok(twin.personal, 'personal');
  assert.ok(twin.goal, 'goal');
  assert.ok(twin.operating_system, 'operating_system');
  assert.ok(twin.decision_identity, 'decision_identity');
  assert.equal(twin._meta?.status, 'active');

  const inject = await loader.getTwinInjectBlock('adam');
  assert.ok(inject.includes('DIGITAL TWIN'));
  assert.ok(inject.includes('30') || inject.includes('30000') || inject.includes('Personal take-home'));
  assert.ok(inject.includes('83') || inject.includes('83000') || inject.includes('Company'));
  assert.ok(inject.includes('WAKE') || inject.includes('9'));
  assert.ok(inject.includes('GVBN') || inject.includes('free') || inject.includes('MODULES'));
  assert.ok(inject.length > 500);
});

test('buildPromptContext includes twin block for adam', async () => {
  const loader = createLuminContextLoader({});
  const ctx = await loader.buildPromptContext({ userHandle: 'adam' });
  assert.ok(ctx.includes('DIGITAL TWIN') || ctx.includes('PERSONAL'));
  assert.ok(ctx.includes('WHYS') || ctx.includes('WHY'));
});