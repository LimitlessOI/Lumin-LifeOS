/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Regression tests for Site Builder discovery route command execution safety.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import createDiscoveryRoutes from '../routes/site-builder-discovery-routes.js';

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

test('POST /discover treats count as argv data, not shell syntax', async () => {
  const marker = path.join(os.tmpdir(), `site-builder-discovery-rce-${process.pid}-${Date.now()}.txt`);
  await fs.rm(marker, { force: true });

  const previousGoogleKey = process.env.GOOGLE_PLACES_KEY;
  delete process.env.GOOGLE_PLACES_KEY;

  const app = express();
  app.use(express.json());
  app.use('/api/v1/sites', createDiscoveryRoutes(app, {
    pool: null,
    requireKey: (_req, _res, next) => next(),
  }));

  const server = await listen(app);
  try {
    const port = server.address().port;
    const shellPayload = `1; "${process.execPath}" -e 'require("node:fs").writeFileSync(${JSON.stringify(marker)},"owned")'`;
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/sites/discover`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        city: 'Austin, TX',
        niche: 'wellness',
        count: shellPayload,
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    await assert.rejects(() => fs.stat(marker), { code: 'ENOENT' });
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    if (previousGoogleKey !== undefined) process.env.GOOGLE_PLACES_KEY = previousGoogleKey;
    else delete process.env.GOOGLE_PLACES_KEY;
    await fs.rm(marker, { force: true });
  }
});
