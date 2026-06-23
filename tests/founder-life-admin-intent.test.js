/**
 * SYNOPSIS: js — tests/founder-life-admin-intent.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFounderPersonalLifeIntent,
  isProductBuildChangeVerb,
} from '../services/founder-life-admin-intent.js';
import {
  isBuildRequest,
  isChairActionableTurn,
  classifyChairIntent,
} from '../services/lumin-chair-orchestrator.js';

const OIL_MSG = 'pretty worried I got to get an oil change should I get to do that on the way out can you find a coupon for me';

test('oil change + coupon is personal life not build', () => {
  assert.equal(isFounderPersonalLifeIntent(OIL_MSG), true);
  assert.equal(isBuildRequest(OIL_MSG), false);
  assert.equal(isChairActionableTurn(OIL_MSG), false);
  assert.equal(classifyChairIntent({ cleanedInput: OIL_MSG }), 'lumin');
});

test('oil change alone is not product build change verb', () => {
  assert.equal(isProductBuildChangeVerb('need an oil change today'), false);
});

test('UI change still builds', () => {
  assert.equal(isProductBuildChangeVerb('change the response bubble color to yellow'), true);
  assert.equal(isBuildRequest('change the response bubble color to yellow'), true);
});

console.log('✅ founder-life-admin-intent.test.js passed');
