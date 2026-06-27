/**
 * SYNOPSIS: Product-home enforcement unit checks.
 * Product-home enforcement unit checks.
 * @ssot docs/products/PRODUCT_REGISTRY.json
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditManifestOwnedSources,
  auditProductPrompts,
  auditMissionContentHistoryMarkers,
  auditAuthorityBoundaryMarkers,
  classifySourceSsot,
  loadProductManifests,
  PRODUCT_CONFIG,
  DEBT_KINDS,
} from '../scripts/lib/product-home-enforce.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('classifySourceSsot accepts canonical home and shared registry', () => {
  const ctx = {
    config: PRODUCT_CONFIG.lifeos,
    shared: new Set(['docs/products/PRODUCT_REGISTRY.json']),
  };
  assert.equal(classifySourceSsot('docs/products/lifeos/PRODUCT_HOME.md', ctx).ok, true);
  assert.equal(classifySourceSsot('docs/products/PRODUCT_REGISTRY.json', ctx).ok, true);
  assert.equal(classifySourceSsot('docs/projects/AMENDMENT_21_LIFEOS_CORE.md', ctx).ok, false);
  assert.equal(classifySourceSsot('docs/products/LIFEOS.md', ctx).kind, 'flat-stub-ssot');
});

test('DEBT_KINDS contains migration-debt violation types', () => {
  assert.ok(DEBT_KINDS.has('missing-ssot'));
  assert.ok(DEBT_KINDS.has('amendment-first-ssot'));
});

test('manifest-owned runtime sources have no hard product-home violations', () => {
  const manifests = loadProductManifests(ROOT);
  // Default mode: only hard violations (flat-stub, foreign-amendment, unexpected)
  const violations = auditManifestOwnedSources(manifests, ROOT);
  assert.equal(violations.length, 0, violations.map((v) => `${v.file}:${v.kind}`).join(', '));
});

test('lifeos product prompts are not amendment-first', () => {
  const violations = auditProductPrompts(ROOT);
  assert.equal(violations.length, 0, violations.map((v) => v.file).join(', '));
});

test('mission CONTENT with amendment @ssot declares HISTORY_SNAPSHOT', () => {
  const violations = auditMissionContentHistoryMarkers(ROOT);
  assert.equal(violations.length, 0, violations.map((v) => v.file).join(', '));
});

test('authority boundary marker docs are present', () => {
  const violations = auditAuthorityBoundaryMarkers(ROOT);
  assert.equal(violations.length, 0, violations.map((v) => `${v.file}:${v.tag || v.kind}`).join(', '));
});
