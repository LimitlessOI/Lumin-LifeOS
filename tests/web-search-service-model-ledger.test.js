/**
 * SYNOPSIS: js — tests/web-search-service-model-ledger.test.js.
 * Regression guard for the North Star §2.0J 'external_research' role wiring
 * added to services/web-search-service.js — not a full re-test of search
 * behavior (already covered implicitly by callers), just that a real
 * Perplexity call records to model_capability_ledger correctly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createWebSearchService } from '../services/web-search-service.js';

function makeFakePool() {
  const inserts = [];
  return {
    inserts,
    query: async (sql, params) => {
      if (/INSERT INTO model_capability_ledger/i.test(sql)) {
        inserts.push({ model_tier: params[0], role: params[1], ok: params[2] });
      }
      return { rows: [] };
    },
  };
}

const originalFetch = global.fetch;

function stubFetch(status, body) {
  global.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

test('createWebSearchService: successful Perplexity call records external_research ok:true', async () => {
  const pool = makeFakePool();
  stubFetch(200, { choices: [{ message: { content: 'real synthesized answer' } }] });
  const svc = createWebSearchService({ PERPLEXITY_API_KEY: 'fake-key', pool });
  await svc.search('test query');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(pool.inserts.length, 1);
  assert.equal(pool.inserts[0].role, 'external_research');
  assert.equal(pool.inserts[0].model_tier, 'perplexity_sonar');
  assert.equal(pool.inserts[0].ok, 1);
  global.fetch = originalFetch;
});

test('createWebSearchService: Perplexity HTTP error records external_research ok:false', async () => {
  const pool = makeFakePool();
  stubFetch(500, {});
  const svc = createWebSearchService({ PERPLEXITY_API_KEY: 'fake-key', pool });
  await svc.search('test query');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(pool.inserts.length, 1);
  assert.equal(pool.inserts[0].ok, 0);
  global.fetch = originalFetch;
});

test('createWebSearchService: no pool passed is a safe no-op, never throws', async () => {
  stubFetch(200, { choices: [{ message: { content: 'answer' } }] });
  const svc = createWebSearchService({ PERPLEXITY_API_KEY: 'fake-key' });
  const result = await svc.search('test query');
  assert.equal(result.source, 'perplexity');
  global.fetch = originalFetch;
});

test('createWebSearchService: no PERPLEXITY_API_KEY never attempts to record (no Brave key either)', async () => {
  const pool = makeFakePool();
  const svc = createWebSearchService({ pool });
  await svc.search('test query');
  assert.equal(pool.inserts.length, 0);
});
