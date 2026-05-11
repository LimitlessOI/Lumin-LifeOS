/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Regression tests for Site Builder discovery route command execution.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import createDiscoveryRoutes from '../routes/site-builder-discovery-routes.js';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test('POST /discover treats city as an argv value, not shell syntax', async () => {
  const marker = join(tmpdir(), `lifeos-discovery-pwned-${process.pid}-${Date.now()}`);
  const maliciousCity = `Testville"; ${process.execPath} -e "require('fs').writeFileSync('${marker}', 'pwned')" ; echo "`;

  const app = express();
  app.use(express.json());
  app.use('/api/v1/sites', createDiscoveryRoutes(app, {
    pool: null,
    requireKey: (req, res, next) => next(),
  }));

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/sites/discover`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ city: maliciousCity, niche: 'wellness', count: 1 }),
    });

    assert.equal(response.status, 200);
    assert.equal(await exists(marker), false, 'malicious city input must not execute shell commands');
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await rm(marker, { force: true });
  }
});
