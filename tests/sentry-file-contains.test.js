/**
 * SYNOPSIS: SENTRY file_contains must honor BUILD_QUEUE must_include arrays.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileContainsNeedles, runSingleAssertion } from '../factory-staging/factory-core/sentry/behavior-assertions.js';

test('fileContainsNeedles reads substring and must_include', () => {
  assert.deepEqual(fileContainsNeedles({ substring: 'ADD COLUMN' }), ['ADD COLUMN']);
  assert.deepEqual(
    fileContainsNeedles({ must_include: ['overlay_devices', 'capabilities'] }),
    ['overlay_devices', 'capabilities'],
  );
  assert.deepEqual(fileContainsNeedles({ path: 'x.sql' }), []);
});

test('file_contains passes must_include without substring (CAPREG-COL class)', async () => {
  const content = '-- @ssot\nALTER TABLE overlay_devices ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT \'{}\'::jsonb;\n';
  const r = await runSingleAssertion(
    {
      type: 'file_contains',
      path: 'db/migrations/20260813_overlay_devices_capabilities.sql',
      must_include: ['overlay_devices', 'capabilities', 'ADD COLUMN'],
    },
    { readFile: async () => content },
  );
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('file_contains fails closed when substring is missing (old false-fail shape)', async () => {
  const r = await runSingleAssertion(
    {
      type: 'file_contains',
      path: 'db/migrations/x.sql',
      must_include: ['overlay_devices'],
    },
    { readFile: async () => 'CREATE TABLE other;' },
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['overlay_devices']);
});

test('file_contains reports the actual missing needle, not needles[0]', async () => {
  const r = await runSingleAssertion(
    {
      type: 'file_contains',
      path: 'services/collectibles/twin-service.js',
      must_include: ['createCollectibleTwin', 'needs_review', 'OWNED_'],
    },
    { readFile: async () => 'export function createCollectibleTwin(){ return { needs_review: true, identity_status: "owned_unverified" }; }' },
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['OWNED_']);
  assert.equal(r.substring, 'OWNED_');
  assert.match(r.reason, /OWNED_/);
});
