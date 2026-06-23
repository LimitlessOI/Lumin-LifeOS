/**
 * SYNOPSIS: js — tests/chair-context-classifier.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveChairContext,
  requiresPreExecuteClarify,
} from '../services/chair-context-classifier.js';
import { classifyChairIntent } from '../services/lumin-chair-orchestrator.js';

const OIL_MSG = 'pretty worried I got to get an oil change should I get to do that on the way out can you find a coupon for me';

test('oil change routes to lumin not build clarify', () => {
  const ctx = resolveChairContext(OIL_MSG, {});
  assert.equal(ctx.channel, 'lumin');
  assert.equal(ctx.domain, 'personal_life');
  assert.equal(ctx.requires_execute_clarify, false);
  assert.equal(requiresPreExecuteClarify(OIL_MSG, {}), false);
  assert.equal(classifyChairIntent({ cleanedInput: OIL_MSG }), 'lumin');
});

test('vague hello routes to lumin not point_b', () => {
  const ctx = resolveChairContext('hey lumin what do you think about my week', {});
  assert.equal(ctx.channel, 'lumin');
  assert.equal(ctx.requires_execute_clarify, false);
});

test('UI build routes build_async; css-only bubble may skip clarify', () => {
  const msg = 'change the response bubble color to yellow';
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'build_async');
});

test('vague product build requires clarify', () => {
  const msg = 'fix the LifeRE page layout';
  assert.equal(requiresPreExecuteClarify(msg, {}), true);
});

test('explicit target skips clarify', () => {
  const msg = 'change bubble color target_file: public/overlay/lifeos-theme-overrides.css';
  assert.equal(requiresPreExecuteClarify(msg, {}), false);
});

console.log('✅ chair-context-classifier.test.js passed');
