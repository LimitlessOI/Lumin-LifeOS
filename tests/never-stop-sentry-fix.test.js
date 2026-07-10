/**
 * SYNOPSIS: js — tests/never-stop-sentry-fix.test.js.
 * Proves the SO-002 self-fix last mile: SENTRY per-product findings become a
 * plan_build_queue task the never-stop loop executes — unless the queue already
 * carries a matching sentry_signature (spin-break when planner cannot localize).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSentryFixWork } from '../services/never-stop-product-factory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIFEOS_QUEUE = path.join(ROOT, 'docs/products/lifeos/BUILD_QUEUE.json');
const FEED = path.join(ROOT, 'products/receipts/SENTRY_FINDINGS_FEED.lifeos-founder-ui.json');

test('discoverSentryFixWork never throws and skips empty / stamped feeds', () => {
  const items = discoverSentryFixWork();
  assert.ok(Array.isArray(items));
  assert.ok(!items.some((i) => i.product_id === 'site-builder'));
});

test('discoverSentryFixWork skips lifeos when queue sentry_signature matches open findings', () => {
  const queue = JSON.parse(fs.readFileSync(LIFEOS_QUEUE, 'utf8'));
  const feed = JSON.parse(fs.readFileSync(FEED, 'utf8'));
  const findings = Array.isArray(feed.findings) ? feed.findings : [];
  const items = discoverSentryFixWork();
  const lifeos = items.find((i) => i.product_id === 'lifeos');

  if (findings.length === 0) {
    assert.equal(lifeos, undefined, 'empty feed must not enroll lifeos');
    return;
  }
  if (queue.sentry_signature) {
    assert.equal(
      lifeos,
      undefined,
      'matching/stamped sentry_signature must stop re-planning the same findings (spin-break)',
    );
    return;
  }
  assert.ok(lifeos, 'open findings without stamp enroll lifeos');
  assert.equal(lifeos.kind, 'plan_build_queue');
  assert.ok(Array.isArray(lifeos.sentry_findings) && lifeos.sentry_findings.length >= 1);
  for (const line of lifeos.sentry_findings) {
    assert.ok(/Proposed fix:/.test(line), `finding line must carry a fix: ${line}`);
  }
});
