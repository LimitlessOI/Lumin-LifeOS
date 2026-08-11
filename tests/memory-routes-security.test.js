/**
 * SYNOPSIS: Security regressions for auto-registered memory routes.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerMemoryRoutes } from '../routes/memory_routes.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function request(server, path, headers = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, method: 'GET', path, headers },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('memory list routes reject unauthenticated reads before querying the database', async (t) => {
  let queryCount = 0;
  const pool = {
    async query() {
      queryCount += 1;
      return { rows: [{ id: 'sensitive-memory-row' }] };
    },
  };
  const requireKey = (req, res, next) => {
    if (req.get('x-command-key') === 'test-command-key') return next();
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  };

  const app = express();
  registerMemoryRoutes(app, {
    pool,
    requireKey,
    callCouncilMember: async () => '',
    logger: null,
  });
  const server = await listen(app);
  t.after(() => close(server));

  const protectedPaths = [
    '/api/memory/capsules',
    '/api/memory/entries',
    '/api/memory/receipts',
    '/api/memory/snapshots',
    '/api/memory/source-of-truth',
  ];

  for (const path of protectedPaths) {
    const response = await request(server, path);
    assert.equal(response.statusCode, 401, `${path} must require authentication`);
    assert.doesNotMatch(response.body, /sensitive-memory-row/);
  }
  assert.equal(queryCount, 0);

  const authorized = await request(server, '/api/memory/capsules', {
    'x-command-key': 'test-command-key',
  });
  assert.equal(authorized.statusCode, 200);
  assert.match(authorized.body, /sensitive-memory-row/);
  assert.equal(queryCount, 1);
});
