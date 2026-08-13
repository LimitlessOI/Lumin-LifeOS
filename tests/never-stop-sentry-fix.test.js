/**
 * SYNOPSIS: js — tests/never-stop-sentry-fix.test.js.
 * LifeOS no longer has a live BUILD_QUEUE. SENTRY self-fix must not recreate one.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSentryFixWork } from '../services/never-stop-product-factory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIFEOS_QUEUE = path.join(ROOT, 'docs/products/lifeos/BUILD_QUEUE.json');

test('discoverSentryFixWork never throws and skips empty / stamped feeds', () => {
  const items = discoverSentryFixWork();
  assert.ok(Array.isArray(items));
  assert.ok(!items.some((i) => i.product_id === 'site-builder'));
});

test('lifeos BUILD_QUEUE is archived — discoverSentryFixWork must not enroll it', () => {
  assert.equal(fs.existsSync(LIFEOS_QUEUE), false, 'live docs/products/lifeos/BUILD_QUEUE.json must not exist');
  const items = discoverSentryFixWork();
  assert.equal(
    items.find((i) => i.product_id === 'lifeos'),
    undefined,
    'SENTRY must not recreate a second queue for lifeos',
  );
});
