/**
 * SYNOPSIS: js — tests/lifeos-service-doctrine.test.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDoctrinePromptBlock,
  assertStackIsNotSeparateProduct,
  validateUserFacingCopy,
  enrichPersonalTwin,
} from '../services/lifeos-service-doctrine.js';

test('doctrine prompt block includes sovereignty and truth', () => {
  const block = getDoctrinePromptBlock();
  assert.match(block, /Serve, don't decide/);
  assert.match(block, /PER-PERSON/);
  assert.match(block, /KNOW/);
});

test('lifere is stack not separate product', () => {
  const r = assertStackIsNotSeparateProduct('lifere');
  assert.equal(r.ok, true);
});

test('forbidden universal motivator copy flagged', () => {
  const bad = validateUserFacingCopy('Manifest millions instantly like magic');
  assert.equal(bad.ok, false);
  const good = validateUserFacingCopy('Here are costs and benefits — you choose.');
  assert.equal(good.ok, true);
});

test('enrichPersonalTwin defaults coaching_tolerance', () => {
  const t = enrichPersonalTwin({ motivations: ['family'] });
  assert.equal(t.schema, 'lifeos_personal_twin_v2');
  assert.equal(t.coaching_tolerance, 'moderate');
  assert.deepEqual(t.motivations_legacy_tags, ['family']);
});
