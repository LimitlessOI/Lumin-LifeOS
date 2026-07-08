/**
 * SYNOPSIS: Provider key-health service — structure + absent-path (no network).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDERS, STATUS, checkAllProviders } from '../services/provider-key-health.js';

test('every provider declares id, label, env vars, a billing link, and a probe', () => {
  assert.ok(PROVIDERS.length >= 10, 'covers the real provider set');
  for (const p of PROVIDERS) {
    assert.ok(p.id && p.label, `${p.id} has id+label`);
    assert.ok(Array.isArray(p.envVars) && p.envVars.length, `${p.id} lists env vars`);
    assert.match(p.billingUrl, /^https:\/\//, `${p.id} has an https billing link`);
    assert.equal(typeof p.probe, 'function', `${p.id} has a probe`);
  }
  // ids are unique
  assert.equal(new Set(PROVIDERS.map((p) => p.id)).size, PROVIDERS.length);
});

test('checkAllProviders marks providers absent when no key is set — and never leaks a value', async () => {
  const names = [...new Set(PROVIDERS.flatMap((p) => p.envVars))];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  try {
    for (const n of names) delete process.env[n];
    const out = await checkAllProviders();
    assert.equal(out.providers.length, PROVIDERS.length);
    assert.ok(out.providers.every((r) => r.status === STATUS.ABSENT && r.present === false));
    assert.equal(out.summary[STATUS.ABSENT], PROVIDERS.length);
    assert.deepEqual(out.needs_payment, []);
    // no result object should ever carry a raw key value
    const blob = JSON.stringify(out);
    assert.ok(!/sk-[A-Za-z0-9]/.test(blob), 'no OpenAI-style key leaked');
  } finally {
    for (const n of names) {
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    }
  }
});
