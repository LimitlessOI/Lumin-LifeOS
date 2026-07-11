/**
 * SYNOPSIS: Regression coverage for founder-interface private/no-save turns.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { after, describe, it } from 'node:test';
import express from 'express';
import { createLifeOSBuilderOSCommandControlRoutes } from '../routes/lifeos-builderos-command-control-routes.js';

const servers = [];

async function listen(app) {
  const server = http.createServer(app);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
});

describe('founder-interface private messages', () => {
  it('does not write chat history or founder memory for private_no_save turns', async () => {
    const queries = [];
    const pool = {
      async query(sql, params = []) {
        const text = String(sql);
        queries.push({ sql: text, params });
        if (/SELECT id FROM lifeos_users/i.test(text)) {
          return { rows: [{ id: 42 }] };
        }
        throw new Error(`unexpected persistence query: ${text}`);
      },
    };

    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/lifeos/builderos/command-control',
      createLifeOSBuilderOSCommandControlRoutes({
        pool,
        requireKey: (_req, _res, next) => next(),
        callCouncilMember: null,
      }),
    );

    const baseUrl = await listen(app);
    const response = await fetch(`${baseUrl}/api/v1/lifeos/builderos/command-control/founder-interface/message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-command-key': 'test' },
      body: JSON.stringify({ text: "private: don't save this sensitive note" }),
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.action, 'private');
    assert.equal(body.classification, 'private_no_save');
    assert.equal(body.persisted, false);
    assert.equal(body.human_summary, 'Private — not saved. Session only.');
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /SELECT id FROM lifeos_users/i);
  });
});
