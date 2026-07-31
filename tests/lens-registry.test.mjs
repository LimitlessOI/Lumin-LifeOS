/**
 * SYNOPSIS: mjs — tests/lens-registry.test.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { loadLensRegistry, loadLens } from '../services/cognitive-chair.mjs';

test('Lens Registry has versioning, evidence_count, trust_score, and retirement_criteria for every lens', () => {
  const registry = loadLensRegistry();
  assert.ok(registry.retirement_criteria, 'registry has retirement_criteria');
  for (const lens of registry.lenses) {
    assert.ok(lens.version, `lens ${lens.lens_id} has version`);
    assert.strictEqual(typeof lens.evidence_count, 'number', `lens ${lens.lens_id} has evidence_count`);
    assert.strictEqual(typeof lens.trust_score, 'number', `lens ${lens.lens_id} has trust_score`);
    assert.ok(lens.retirement_criteria, `lens ${lens.lens_id} has retirement_criteria`);
  }
});

test('Adversarial lenses are registered and loadable', () => {
  const registry = loadLensRegistry();
  const ids = new Set(registry.lenses.map((l) => l.lens_id));
  assert.ok(ids.has('skeptic'), 'skeptic lens registered');
  assert.ok(ids.has('devils-advocate'), 'devils-advocate lens registered');
  assert.ok(ids.has('red-team'), 'red-team lens registered');

  for (const id of ['skeptic', 'devils-advocate', 'red-team']) {
    const lens = loadLens(id);
    assert.ok(lens.philosophy, `${id} has philosophy`);
    assert.ok(Array.isArray(lens.strengths), `${id} has strengths`);
    assert.ok(Array.isArray(lens.blind_spots), `${id} has blind_spots`);
  }
});
