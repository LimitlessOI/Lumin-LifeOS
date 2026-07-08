/**
 * SYNOPSIS: js — tests/never-stop-sentry-fix.test.js.
 * Proves the SO-002 self-fix last mile: SENTRY per-product findings become a
 * plan_build_queue task the never-stop loop executes, so a gate FAIL turns into
 * a governed fix with no conductor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverSentryFixWork } from '../services/never-stop-product-factory.js';

test('discoverSentryFixWork turns the real lifeos-founder-ui SENTRY findings into a plan task', () => {
  const items = discoverSentryFixWork();
  const lifeos = items.find((i) => i.product_id === 'lifeos');
  assert.ok(lifeos, 'the lifeos-founder-ui feed (4 solution-bearing findings) enrolls the lifeos product');
  assert.equal(lifeos.kind, 'plan_build_queue');
  assert.ok(Array.isArray(lifeos.sentry_findings) && lifeos.sentry_findings.length >= 1);
  assert.ok(typeof lifeos.sentry_signature === 'string' && lifeos.sentry_signature.length > 0);
  // Gate FAILs are top-tier product work — planned just under fresh build steps.
  assert.ok(lifeos.priority >= 2 && lifeos.priority < 3);
  // Solution-mandatory: every enrolled finding carries its proposed fix into the backlog.
  for (const line of lifeos.sentry_findings) {
    assert.ok(/Proposed fix:/.test(line), `finding line must carry a fix: ${line}`);
  }
});

test('discoverSentryFixWork never throws and skips empty feeds', () => {
  const items = discoverSentryFixWork();
  assert.ok(Array.isArray(items));
  // The site-builder feed currently has zero findings — it must NOT be enrolled.
  assert.ok(!items.some((i) => i.product_id === 'site-builder'));
});
