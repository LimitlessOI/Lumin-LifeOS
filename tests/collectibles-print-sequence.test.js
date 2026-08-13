/**
 * SYNOPSIS: Collectibles sealed print never idles — enrolls through V10 unless reassigned.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLECTIBLES_PRINT_SEQUENCE,
  nextSealedCollectiblesSlice,
  enrollNextCollectiblesPrintSlice,
  ensureCollectiblesPrintEnrolled,
  collectiblesPrintStillOpen,
  collectiblesLaneReassigned,
  collectiblesPrintTerminalId,
  prepareOverlayManufacturingQueue,
  healCollectiblesBlueprintAuthority,
} from '../services/product-build-orchestrator.js';
import { ownerFor } from '../config/lane-assignment.js';

test('COLLECTIBLES_PRINT_SEQUENCE runs V1 through V10 and ends at V10 acceptance', () => {
  assert.ok(COLLECTIBLES_PRINT_SEQUENCE.length >= 30);
  const ids = COLLECTIBLES_PRINT_SEQUENCE.map((s) => s.id);
  assert.ok(ids.includes('COLLECTIBLES-V1-SCHEMA-TWINS-001'));
  assert.ok(ids.includes('COLLECTIBLES-V2-WANT-GRAPH-001'));
  assert.ok(ids.includes('COLLECTIBLES-V10-ACCEPTANCE-001'));
  assert.equal(collectiblesPrintTerminalId(), 'COLLECTIBLES-V10-ACCEPTANCE-001');
  assert.ok(ids.every((id) => /^COLLECTIBLES-V\d+-/.test(id)));
});

test('after foundation DONE, prepare enrolls SCHEMA (not idle)', () => {
  const foundation = [
    'COLLECTIBLES-V1-ADAPTER-INTERFACE-001',
    'COLLECTIBLES-V1-TWIN-SERVICE-001',
    'COLLECTIBLES-V1-MTG-ADAPTER-001',
    'COLLECTIBLES-V1-ROUTES-001',
    'COLLECTIBLES-V1-ACCEPTANCE-001',
  ];
  const queue = {
    product_id: 'universal-overlay',
    steps: foundation.map((id) => ({
      id,
      status: 'done',
      product_id: 'collectibles',
      source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — V1 Trusted Personal Vault foundation',
      target_file: `services/collectibles/${id}.js`,
    })),
  };
  const next = nextSealedCollectiblesSlice(queue);
  assert.equal(next?.id, 'COLLECTIBLES-V1-SCHEMA-TWINS-001');
  const { enrolled_collectibles } = prepareOverlayManufacturingQueue(queue);
  assert.equal(enrolled_collectibles, 'COLLECTIBLES-V1-SCHEMA-TWINS-001');
  assert.equal(collectiblesPrintStillOpen(queue), true);
  assert.equal(ownerFor('db/migrations/20260813_collectible_twins_v1.sql'), 'factory-3');
});

test('ensureCollectiblesPrintEnrolled is a no-op when a Collectibles step is already open', () => {
  const schema = COLLECTIBLES_PRINT_SEQUENCE.find((s) => s.id === 'COLLECTIBLES-V1-SCHEMA-TWINS-001');
  assert.ok(schema);
  // Build explicitly — do not rely on spread of sequence object identity.
  const queue = {
    product_id: 'universal-overlay',
    steps: [{
      id: schema.id,
      status: 'pending',
      product_id: 'collectibles',
      source: String(schema.source),
      target_file: schema.target_file,
    }],
  };
  // ensure* refuses to pile on while something Collectibles is already open.
  // enrollNext* still walks the sealed sequence (foundation may be missing on a
  // fresh queue) — that is intentional and not the never-idle gate.
  assert.equal(ensureCollectiblesPrintEnrolled(queue), null, `source=${queue.steps[0].source}`);
  assert.equal(queue.steps.length, 1);
});

test('V2 does not enroll until V1 Layer B is DONE', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: COLLECTIBLES_PRINT_SEQUENCE
      .filter((s) => String(s.id).startsWith('COLLECTIBLES-V1-'))
      .filter((s) => s.id !== 'COLLECTIBLES-V1-LAYER-B-001')
      .map((s) => ({ ...s, status: 'done' })),
  };
  // Layer B not on queue and its deps may not all be done in this reduced set —
  // enroll next ready V1 slice (LAYER-B) before any V2.
  const next = nextSealedCollectiblesSlice(queue);
  assert.ok(next);
  assert.match(next.id, /^COLLECTIBLES-V1-/);
  assert.notEqual(next.id, 'COLLECTIBLES-V2-WANT-GRAPH-001');
});

test('healCollectiblesBlueprintAuthority unblocks NOT_ON_BLUEPRINT Collectibles twin miss', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [{
      id: 'COLLECTIBLES-V1-SCHEMA-TWINS-001',
      status: 'blocked',
      last_error: 'NOT_ON_BLUEPRINT',
      blueprint_id: 'PRODUCT-COLLECTIBLES-BUILD-QUEUE-TWIN-V1',
      mission_id: 'PRODUCT-collectibles',
      product_id: 'collectibles',
      source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — V1 Trusted Personal Vault',
      target_file: 'db/migrations/20260813_collectible_twins_v1.sql',
    }],
  };
  assert.deepEqual(healCollectiblesBlueprintAuthority(queue), ['COLLECTIBLES-V1-SCHEMA-TWINS-001']);
  assert.equal(queue.steps[0].status, 'pending');
  assert.equal(queue.steps[0].blueprint_id, 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1');
  assert.equal(queue.steps[0].last_error, null);
});

test('collectiblesLaneReassigned allows honest idle', () => {
  const prev = process.env.FACTORY_3_REASSIGNED;
  process.env.FACTORY_3_REASSIGNED = '1';
  try {
    assert.equal(collectiblesLaneReassigned(), true);
    assert.equal(collectiblesPrintStillOpen({ steps: [] }), false);
  } finally {
    if (prev == null) delete process.env.FACTORY_3_REASSIGNED;
    else process.env.FACTORY_3_REASSIGNED = prev;
  }
});
