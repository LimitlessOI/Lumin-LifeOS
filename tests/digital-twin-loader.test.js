/**
 * SYNOPSIS: Unit tests for digital twin inject loader.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLuminContextLoader,
  evaluateTwinGate,
  fieldValue,
  isFounderTwinHardGated,
  learnFromFounderMessage,
} from '../services/lumin-context-loader.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_USER = '__twin_learn_test__';
const TEST_DIR = path.join(ROOT, 'data/twins/default', TEST_USER);

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

test('founder twin hard gate passes for active Adam twin', async () => {
  const prev = process.env.TWIN_HARD_GATE;
  delete process.env.TWIN_HARD_GATE;
  assert.equal(isFounderTwinHardGated('adam'), true);
  assert.equal(isFounderTwinHardGated('someone_else'), false);

  const loader = createLuminContextLoader({});
  const gate = await loader.getTwinGate('adam');
  assert.equal(gate.ok, true, gate.reason);
  assert.equal(gate.reason, 'ok');

  const fail = evaluateTwinGate({ _meta: { status: 'draft' } }, '');
  assert.equal(fail.ok, false);
  process.env.TWIN_HARD_GATE = prev;
});

test('TWIN_HARD_GATE=0 disables founder hard gate', () => {
  const prev = process.env.TWIN_HARD_GATE;
  process.env.TWIN_HARD_GATE = '0';
  assert.equal(isFounderTwinHardGated('adam'), false);
  process.env.TWIN_HARD_GATE = prev;
});

test('learnFromFounderMessage writes memory + decision heuristics', async () => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(TEST_DIR, '_meta.json'),
    `${JSON.stringify({ schema: 'digital_twin_meta_v1', status: 'active', user_id: TEST_USER }, null, 2)}\n`,
  );

  const decisionText = 'I decided that from now on founder chat must hard-gate on the digital twin and always learn from my decisions.';
  const result = await learnFromFounderMessage({
    userHandle: TEST_USER,
    messageText: decisionText,
    source: 'unit_test',
  });
  assert.equal(result.learned, true);
  assert.equal(result.decision_learned, true);
  assert.ok(result.writes.includes('memory'));
  assert.ok(result.writes.includes('decision_identity'));

  const memory = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'memory.json'), 'utf8'));
  assert.ok(memory.episodic_summaries?.length >= 1);
  const decision = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'decision_identity.json'), 'utf8'));
  assert.ok(decision.layers.heuristics.some((h) => String(h.pattern_text).includes('hard-gate')));
  const meta = JSON.parse(fs.readFileSync(path.join(TEST_DIR, '_meta.json'), 'utf8'));
  assert.ok(meta.last_learned_at);

  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});