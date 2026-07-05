/**
 * SYNOPSIS: Security regressions for Site Builder routes.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiteBuilderRoutes } from '../routes/site-builder-routes.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function request(server, reqPath, { method = 'GET', headers = {}, body = '' } = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers: {
          ...(body ? { 'content-length': Buffer.byteLength(body) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('preview static route does not serve files outside public/previews', async (t) => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'site-builder-preview-'));
  const previousCwd = process.cwd();
  mkdirSync(path.join(tmp, 'public', 'previews'), { recursive: true });
  writeFileSync(path.join(tmp, 'public', 'previews', 'index.html'), 'preview-ok');
  writeFileSync(path.join(tmp, 'secret.txt'), 'do-not-serve');

  process.chdir(tmp);
  const app = express();
  createSiteBuilderRoutes(app, {
    requireKey: (_req, _res, next) => next(),
    callCouncilMember: null,
    baseUrl: 'http://127.0.0.1',
  });
  const server = await listen(app);

  t.after(async () => {
    await close(server);
    process.chdir(previousCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  const ok = await request(server, '/previews/');
  assert.equal(ok.statusCode, 200);
  assert.match(ok.body, /preview-ok/);

  const traversal = await request(server, '/previews/%2e%2e/%2e%2e/secret.txt');
  assert.notEqual(traversal.statusCode, 200);
  assert.doesNotMatch(traversal.body, /do-not-serve/);
});

test('email reply webhook fails closed when token is not configured', async (t) => {
  const previousToken = process.env.POSTMARK_WEBHOOK_TOKEN;
  delete process.env.POSTMARK_WEBHOOK_TOKEN;

  const app = express();
  app.use(express.json());
  createSiteBuilderRoutes(app, {
    requireKey: (_req, _res, next) => next(),
    callCouncilMember: null,
    baseUrl: 'http://127.0.0.1',
  });
  const server = await listen(app);

  t.after(async () => {
    await close(server);
    if (previousToken === undefined) delete process.env.POSTMARK_WEBHOOK_TOKEN;
    else process.env.POSTMARK_WEBHOOK_TOKEN = previousToken;
  });

  const res = await request(server, '/api/v1/sites/email-reply-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ From: 'prospect@example.com' }),
  });

  assert.equal(res.statusCode, 503);
  assert.match(res.body, /webhook not configured/);
});
