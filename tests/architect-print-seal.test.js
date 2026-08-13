/**
 * SYNOPSIS: Architect owns print sequence custody — Cursor must not author slices.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadSealedPrintSequence,
  sealPrintSequence,
  hasSealedPrintSequence,
  ARCHITECT_PRINT_SEAL_REQUIRED,
  printSequenceArtifactPath,
} from '../services/architect-print-seal.js';
import { COLLECTIBLES_PRINT_SEQUENCE, COLLECTIBLES_PRINT_SEAL_META } from '../config/overlay-print-sequence.js';
import { stepsFromAmendedBlueprint } from '../scripts/architect-seal-print-sequence.mjs';

test('live Collectibles print loads from Architect-sealed artifact not inline config', () => {
  assert.ok(COLLECTIBLES_PRINT_SEQUENCE.length >= 30);
  assert.equal(COLLECTIBLES_PRINT_SEAL_META.sealed_by, 'architect_print_seal');
  assert.match(COLLECTIBLES_PRINT_SEAL_META.path, /collectibles\/PRINT_SEQUENCE\.json$/);
  assert.ok(hasSealedPrintSequence('collectibles'));
});

test('missing seal fails closed with ARCHITECT_PRINT_SEAL_REQUIRED', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-print-'));
  assert.throws(
    () => loadSealedPrintSequence('no-such-product', { repoRoot: tmp }),
    (err) => String(err.message).includes(ARCHITECT_PRINT_SEAL_REQUIRED),
  );
});

test('sealPrintSequence is the only writer path for PRINT_SEQUENCE.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-print-'));
  const steps = [{
    id: 'COLLECTIBLES-V1-DEMO-001',
    target_file: 'services/collectibles/demo.js',
    product_id: 'collectibles',
    source: 'docs/products/collectibles/MASTER_BLUEPRINT.md',
    status: 'pending',
  }];
  const out = sealPrintSequence({
    productId: 'collectibles',
    steps,
    source_docs: ['docs/products/collectibles/MASTER_BLUEPRINT.md'],
    repoRoot: tmp,
  });
  assert.equal(out.ok, true);
  assert.equal(fs.existsSync(printSequenceArtifactPath('collectibles', tmp)), true);
  const loaded = loadSealedPrintSequence('collectibles', { repoRoot: tmp });
  assert.equal(loaded.steps[0].id, 'COLLECTIBLES-V1-DEMO-001');
});

test('stepsFromAmendedBlueprint projects print without inventing ids', () => {
  const steps = stepsFromAmendedBlueprint({
    steps: [{
      id: 'COLLECTIBLES-V2-WANT-GRAPH-001',
      target_file: 'services/collectibles/want-graph.js',
      depends_on: ['COLLECTIBLES-V1-LAYER-B-001'],
      purpose: 'Want graph',
    }],
  }, { productId: 'collectibles' });
  assert.equal(steps[0].id, 'COLLECTIBLES-V2-WANT-GRAPH-001');
  assert.equal(steps[0].product_id, 'collectibles');
  assert.match(steps[0].source, /MASTER_BLUEPRINT/);
});
