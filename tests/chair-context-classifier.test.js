/**
 * SYNOPSIS: js — tests/chair-context-classifier.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveChairContext,
  requiresPreExecuteClarify,
} from '../services/chair-context-classifier.js';
import { isFounderRepairOrderIntent } from '../services/chair-intent-signals.js';
import { classifyChairIntent } from '../services/lumin-chair-orchestrator.js';

const OIL_MSG = 'pretty worried I got to get an oil change should I get to do that on the way out can you find a coupon for me';

test('oil change routes to lumin personal-life counsel not build clarify', () => {
  const ctx = resolveChairContext(OIL_MSG, {});
  assert.equal(ctx.channel, 'lumin');
  assert.equal(ctx.domain, 'personal_life');
  assert.equal(ctx.requires_execute_clarify, false);
  assert.equal(requiresPreExecuteClarify(OIL_MSG, {}), false);
  assert.equal(classifyChairIntent({ cleanedInput: OIL_MSG }), 'lumin');
});

test('vague hello routes to chair not point_b', () => {
  const ctx = resolveChairContext('hey lumin what do you think about my week', {});
  assert.equal(ctx.channel, 'chair');
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

test('founder repair order detected and scores build path', () => {
  const msg = "you're supposed to fix this — make that change, don't tell me what the problem is";
  assert.equal(isFounderRepairOrderIntent(msg), true);
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'build_async');
});

test('natural enter-send ask is product build not repair-order HALT', () => {
  const msg = 'I want you to make it so when I hit enter after typing out a response in this box for it to send the message instead of go down to the next line';
  assert.equal(isFounderRepairOrderIntent(msg), false);
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'build_async');
});

test('blueprint status follow-up routes to point_b not display', () => {
  const msg = 'status on the blueprint step you just started';
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'point_b');
});

test('continue toward point b routes to point_b not mission_pipeline', () => {
  const msg = 'continue building toward point b until pass or exact blocker';
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'point_b');
});

test('keep going until pass stays in point_b continuation lane', () => {
  const msg = 'keep going until pass or exact blocker';
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'point_b');
});

test('explicit execute mission for known mission routes to point_b', () => {
  const msg = 'run execute mission for PRODUCT-LIFERE-OS-V1-0001';
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'point_b');
});

test('do: run pre-build gate routes to build_async', () => {
  const result = resolveChairContext('do: run pre-build gate and report status', {
    explicitAction: 'auto',
    explicitExecute: false,
    shouldDisplayOnly: false,
    useTerminalForBuild: false,
  });

  assert.equal(result.channel, 'build_async');
  assert.equal(result.domain, 'product_build');
});

test('pipeline governance counsel stays on chair — not intake_blueprint', () => {
  const msg = 'Counsel only: ratify governance — Chair ideation, Architect digital twin, Creative Engine design approval, Factory execute only. Dual-judge honesty. Separation of powers. Never redefine Point A/B.';
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'chair');
  assert.equal(ctx.domain, 'governance');
});

console.log('✅ chair-context-classifier.test.js passed');