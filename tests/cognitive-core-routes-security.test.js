/**
 * SYNOPSIS: Cognitive Core founder-data authorization boundary tests.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createCognitiveCoreRoutes } from '../routes/cognitive-core-routes.js';

async function requestHealth(lifeosUser) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/cognitive-core', createCognitiveCoreRoutes({
    requireKey: (req, _res, next) => {
      if (lifeosUser) req.lifeosUser = lifeosUser;
      next();
    },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  }));

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/cognitive-core/health`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

test('Cognitive Core rejects ordinary account members from founder judgment data', async () => {
  const response = await requestHealth({ sub: '42', role: 'member' });
  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { ok: false, error: 'Founder access required' });
});

test('Cognitive Core permits founder account access', async () => {
  const response = await requestHealth({ sub: '1', role: 'founder_admin' });
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test('Cognitive Core preserves command-key automation access', async () => {
  const response = await requestHealth(null);
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});
