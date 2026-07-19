/**
 * SYNOPSIS: Cognitive Core Era-1 unit tests — detection, working memory, contracts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectJudgmentTurn,
  selectWorkingMemory,
  extractOptions,
  inferJudgmentDomain,
  resolveCapsuleContracts,
} from '../services/cognitive-core-perspective.js';
import {
  CAPSULE_CONTRACTS,
  suppressTextForCapsule,
  suppressSystemFactsForCapsule,
  DEFAULT_DECISION_WEAR,
} from '../config/judgment-capsule-contracts.js';
import { isBuildRequest } from '../services/chair-intent-signals.js';

test('detectJudgmentTurn: should I or → decision wear', () => {
  const d = detectJudgmentTurn(
    'Should I push authentication harder this week, or pause and make the founder chat feel human first?',
  );
  assert.equal(d.is_judgment_turn, true);
  assert.equal(d.decision_intent, true);
  assert.deepEqual(d.default_wear, DEFAULT_DECISION_WEAR);
});

test('detectJudgmentTurn: worn capsules alone trigger', () => {
  const d = detectJudgmentTurn('Tell me about SiteBuilder', { worn: ['customer', 'competitor'] });
  assert.equal(d.is_judgment_turn, true);
  assert.deepEqual(d.default_wear, ['customer', 'competitor']);
});

test('isBuildRequest: should I X or make Y is NOT a build', () => {
  assert.equal(
    isBuildRequest(
      'Should I push authentication harder this week, or pause and make the founder chat feel human first?',
    ),
    false,
  );
});

test('customer capsule suppresses roadmap / build facts', () => {
  const customer = CAPSULE_CONTRACTS.customer;
  const facts = suppressSystemFactsForCapsule(
    { live_builder_status: { summary: 'busy' }, personal_twin: { x: 1 }, foo: 1 },
    customer,
  );
  assert.equal(facts.live_builder_status, undefined);
  assert.equal(facts.foo, 1);
  const text = suppressTextForCapsule('Our roadmap and Point B are blocked', customer);
  assert.match(text, /\[suppressed\]/);
});

test('selectWorkingMemory respects scarcity cap', () => {
  const items = Array.from({ length: 40 }, (_, i) => ({
    text: `m${i}`,
    relevance: i / 40,
    recency: 0.5,
    identity_affinity: 0.5,
  }));
  const picked = selectWorkingMemory(items, 20);
  assert.equal(picked.length, 20);
  assert.ok(picked[0].gravity >= picked[picked.length - 1].gravity);
});

test('extractOptions and domain inference', () => {
  const opts = extractOptions('Should I hire Jane or keep contracting?');
  assert.ok(opts.length >= 2);
  assert.equal(inferJudgmentDomain('Should we hire a designer?'), 'hiring');
  assert.equal(inferJudgmentDomain('SiteBuilder Canva integrate?'), 'sitebuilder');
});

test('resolveCapsuleContracts filters unknown', () => {
  const caps = resolveCapsuleContracts(['founder', 'nope', 'anti_you', 'founder']);
  assert.deepEqual(caps.map((c) => c.id), ['founder', 'anti_you']);
});