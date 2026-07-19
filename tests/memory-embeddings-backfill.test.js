/**
 * SYNOPSIS: js — tests/memory-embeddings-backfill.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { backfillMemoryEmbeddings } from '../scripts/memory-embeddings-backfill.mjs';

function fakePool(rows, { onUpdate } = {}) {
  return {
    query: async (sql, params) => {
      if (sql.includes('WHERE mc.embedding IS NULL')) {
        return { rows };
      }
      if (sql.includes('UPDATE memory_capsules SET embedding')) {
        onUpdate?.(params);
        return { rows: [] };
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

test('backfillMemoryEmbeddings: no candidates — no API calls, clean zero result', async () => {
  const pool = fakePool([]);
  let called = false;
  const fetchFn = async () => { called = true; return { ok: true, json: async () => ({ data: [{ embedding: [1] }] }) }; };
  const result = await backfillMemoryEmbeddings({ pool, apiKey: 'k', fetchFn });
  assert.deepEqual(result, { candidates: 0, succeeded: 0, failed: 0 });
  assert.equal(called, false);
});

test('backfillMemoryEmbeddings: generates and writes back an embedding for each candidate, combining title + fact text', async () => {
  const rows = [
    { capsule_id: 'a', title: 'Railway deployment healthy', fact_text: 'Deploy SHA parity confirmed' },
    { capsule_id: 'b', title: 'GEMINI_API_KEY confirmed present', fact_text: null },
  ];
  const updates = [];
  const pool = fakePool(rows, { onUpdate: (params) => updates.push(params) });

  const fakeVector = new Array(1536).fill(0.1);
  const inputsSeen = [];
  const fetchFn = async (url, opts) => {
    const body = JSON.parse(opts.body);
    inputsSeen.push(body.input);
    return { ok: true, json: async () => ({ data: [{ embedding: fakeVector }] }) };
  };

  const result = await backfillMemoryEmbeddings({ pool, apiKey: 'k', fetchFn });
  assert.deepEqual(result, { candidates: 2, succeeded: 2, failed: 0 });
  assert.equal(inputsSeen[0], 'Railway deployment healthy — Deploy SHA parity confirmed');
  assert.equal(inputsSeen[1], 'GEMINI_API_KEY confirmed present', 'a null fact_text must not produce a trailing " — "');
  assert.equal(updates.length, 2);
  assert.equal(updates[0][1], 'a');
  assert.match(updates[0][0], /^\[0\.1,0\.1/);
});

test('backfillMemoryEmbeddings: one capsule failing does not block the rest of the batch', async () => {
  const rows = [
    { capsule_id: 'fails', title: 'Bad one', fact_text: null },
    { capsule_id: 'ok', title: 'Good one', fact_text: null },
  ];
  const pool = fakePool(rows);
  let callCount = 0;
  const fetchFn = async () => {
    callCount += 1;
    if (callCount === 1) return { ok: false, status: 500, text: async () => 'server error' };
    return { ok: true, json: async () => ({ data: [{ embedding: [0.5] }] }) };
  };

  const result = await backfillMemoryEmbeddings({ pool, apiKey: 'k', fetchFn, logger: { warn() {} } });
  assert.deepEqual(result, { candidates: 2, succeeded: 1, failed: 1 });
});

test('backfillMemoryEmbeddings: respects the batchSize limit passed through to the query', async () => {
  let capturedParams;
  const pool = {
    query: async (sql, params) => {
      if (sql.includes('LIMIT $1')) capturedParams = params;
      return { rows: [] };
    },
  };
  await backfillMemoryEmbeddings({ pool, apiKey: 'k', fetchFn: async () => ({}), batchSize: 3 });
  assert.deepEqual(capturedParams, [3]);
});
