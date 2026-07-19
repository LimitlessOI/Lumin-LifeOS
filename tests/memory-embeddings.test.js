/**
 * SYNOPSIS: js — tests/memory-embeddings.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateEmbedding, toPgVectorLiteral } from '../services/memory-embeddings.js';

test('generateEmbedding: rejects empty text without ever calling the API', async () => {
  let called = false;
  const fetchFn = async () => { called = true; return { ok: true, json: async () => ({}) }; };
  await assert.rejects(() => generateEmbedding('', { apiKey: 'k', fetchFn }), /empty text/);
  await assert.rejects(() => generateEmbedding('   ', { apiKey: 'k', fetchFn }), /empty text/);
  assert.equal(called, false);
});

test('generateEmbedding: rejects with no API key, never calls fetch', async () => {
  let called = false;
  const fetchFn = async () => { called = true; return { ok: true, json: async () => ({}) }; };
  await assert.rejects(() => generateEmbedding('hello', { apiKey: null, fetchFn }), /OPENAI_API_KEY/);
  assert.equal(called, false);
});

test('generateEmbedding: posts the right request shape and parses a real-shaped response', async () => {
  let captured;
  const fakeVector = new Array(1536).fill(0).map((_, i) => i / 1536);
  const fetchFn = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      json: async () => ({ data: [{ embedding: fakeVector }], model: 'text-embedding-3-small' }),
    };
  };
  const result = await generateEmbedding('LifeOS is the founder priority', { apiKey: 'sk-test', fetchFn });
  assert.equal(result.length, 1536);
  assert.equal(captured.url, 'https://api.openai.com/v1/embeddings');
  assert.equal(captured.opts.headers.Authorization, 'Bearer sk-test');
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.model, 'text-embedding-3-small');
  assert.equal(body.input, 'LifeOS is the founder priority');
});

test('generateEmbedding: a non-ok API response throws with the status and body surfaced', async () => {
  const fetchFn = async () => ({ ok: false, status: 429, text: async () => 'rate limited' });
  await assert.rejects(() => generateEmbedding('hi', { apiKey: 'k', fetchFn }), /429/);
});

test('generateEmbedding: a response with no embedding data throws clearly rather than returning garbage', async () => {
  const fetchFn = async () => ({ ok: true, json: async () => ({ data: [] }) });
  await assert.rejects(() => generateEmbedding('hi', { apiKey: 'k', fetchFn }), /no embedding vector/);
});

test('toPgVectorLiteral: formats a number array as a pgvector literal', () => {
  assert.equal(toPgVectorLiteral([1, 2.5, -3]), '[1,2.5,-3]');
});

test('toPgVectorLiteral: rejects an empty or non-array input rather than producing an invalid literal', () => {
  assert.throws(() => toPgVectorLiteral([]));
  assert.throws(() => toPgVectorLiteral(null));
  assert.throws(() => toPgVectorLiteral('not an array'));
});
