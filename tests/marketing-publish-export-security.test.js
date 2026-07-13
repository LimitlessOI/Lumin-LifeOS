/**
 * SYNOPSIS: MarketingOS publish/export owner-scope and publish evidence regression tests.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { registerMarketingPublishRoutes } from '../routes/marketing-publish-routes.js';
import { registerMarketingSessionExportRoutes } from '../routes/marketing-session-export-routes.js';
import { buildSessionExport } from '../services/marketing-session-export.js';
import { publishApprovedPiece } from '../services/marketing-publisher.js';

function ownerUuid(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  const hex = createHash('sha256').update(`marketing-owner:${s}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function createApp() {
  const routes = new Map();
  return {
    routes,
    get(path, ...handlers) {
      routes.set(`GET ${path}`, handlers);
    },
    post(path, ...handlers) {
      routes.set(`POST ${path}`, handlers);
    },
  };
}

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}

async function invoke(handlers, req, res) {
  let index = 0;
  async function next() {
    const handler = handlers[index];
    index += 1;
    if (handler) {
      await handler(req, res, next);
    }
  }
  await next();
  return res;
}

function passAuth(req, res, next) {
  return next();
}

test('publish route scopes piece lookup to authenticated owner and ignores spoofed owner_id', async () => {
  const app = createApp();
  const pieceId = '11111111-1111-4111-8111-111111111111';
  const attackerOwner = ownerUuid('attacker-user');
  let createBrowserSessionCalled = false;

  const pool = {
    async query(sql, params) {
      assert.match(sql, /INNER JOIN marketing_sessions s ON s\.id = p\.session_id/);
      assert.match(sql, /s\.owner_id = \$2/);
      assert.deepEqual(params, [pieceId, attackerOwner]);
      return { rows: [] };
    },
  };

  registerMarketingPublishRoutes(app, {
    pool,
    requireKey: passAuth,
    createBrowserSession: async () => {
      createBrowserSessionCalled = true;
      throw new Error('must not create a browser session for unauthorized publish');
    },
  });

  const res = await invoke(app.routes.get('POST /api/v1/marketing/publish'), {
    body: { piece_id: pieceId, owner_id: ownerUuid('victim-user') },
    query: {},
    lifeosUser: { sub: 'attacker-user' },
  }, createRes());

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { ok: false, error: 'piece_not_found' });
  assert.equal(createBrowserSessionCalled, false);
});

test('session export service requires owner scope and filters session by owner_id', async () => {
  const sessionId = '22222222-2222-4222-8222-222222222222';
  const ownerId = ownerUuid('export-owner');
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) {
        assert.match(sql, /from marketing_sessions/);
        assert.match(sql, /owner_id = \$2/);
        assert.deepEqual(params, [sessionId, ownerId]);
        return {
          rows: [{
            id: sessionId,
            owner_id: ownerId,
            session_type: 'coaching',
            status: 'completed',
            coach_messages_json: [],
          }],
        };
      }
      if (calls.length === 2) return { rows: [] };
      if (calls.length === 3) return { rows: [] };
      return { rows: [{ id: 'export-row' }] };
    },
  };

  await assert.rejects(
    () => buildSessionExport(sessionId, 'json', db, async () => 'export text'),
    /requires ownerId/
  );

  const result = await buildSessionExport(sessionId, 'json', db, async () => 'export text', { ownerId });
  assert.equal(result.sessionId, sessionId);
  assert.equal(result.exportText, 'export text');
});

test('alternate export status route is owner-scoped', async () => {
  const app = createApp();
  const sessionId = '33333333-3333-4333-8333-333333333333';
  const ownerId = ownerUuid('status-owner');
  const db = {
    async query(sql, params) {
      assert.match(sql, /INNER JOIN marketing_sessions s ON s\.id = e\.session_id/);
      assert.match(sql, /s\.owner_id = \$2/);
      assert.deepEqual(params, [sessionId, ownerId]);
      return { rows: [] };
    },
  };

  await registerMarketingSessionExportRoutes(app, {
    pool: db,
    requireKey: passAuth,
    callCouncilMember: async () => 'unused',
  });

  const res = await invoke(app.routes.get('GET /marketing/session/:id/export/status'), {
    params: { id: sessionId },
    body: { owner_id: ownerUuid('spoofed-owner') },
    query: {},
    lifeosUser: { sub: 'status-owner' },
  }, createRes());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test('publisher does not mark replay published without verified page evidence', async () => {
  const oldFlag = process.env.LIVE_SOCIAL_PUBLISH_ENABLED;
  process.env.LIVE_SOCIAL_PUBLISH_ENABLED = 'true';
  const queries = [];
  const insertedStatuses = [];
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (/FROM marketing_social_connections/.test(sql)) {
        return {
          rows: [{
            id: 'connection-1',
            owner_id: ownerUuid('publisher-owner'),
            platform: 'linkedin',
            auth_mode: 'browser_session',
            session_state_encrypted: null,
            status: 'connected',
          }],
        };
      }
      if (/FROM marketing_social_posting_templates/.test(sql)) {
        return {
          rows: [{
            id: 'template-1',
            platform: 'linkedin',
            goal_key: 'publish_post',
            steps_json: [],
          }],
        };
      }
      if (/INSERT INTO marketing_publish_records/.test(sql)) {
        insertedStatuses.push(params[3]);
        return { rows: [] };
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
  const session = {
    async observePage() {
      return { url: 'https://www.linkedin.com/feed/', title: 'LinkedIn', text: 'no publish controls here', elements: [] };
    },
    async currentUrl() {
      return 'https://www.linkedin.com/feed/';
    },
    page: {
      url() {
        return 'https://www.linkedin.com/feed/';
      },
      async title() {
        return 'LinkedIn';
      },
      async evaluate() {
        return [];
      },
    },
    async pageText() {
      return 'no publish controls here';
    },
    async navigate() {},
    async click() {},
    async fill() {},
  };

  try {
    const result = await publishApprovedPiece({
      pool,
      piece: {
        id: '44444444-4444-4444-8444-444444444444',
        owner_id: ownerUuid('publisher-owner'),
        platform: 'linkedin',
        content_text: 'Real post text',
        status: 'approved',
      },
      session,
      callModel: async () => JSON.stringify({ type: 'give_up', reason: 'test_no_evidence' }),
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /gave_up:test_no_evidence/);
    assert.deepEqual(insertedStatuses, ['failed']);
  } finally {
    if (oldFlag === undefined) {
      delete process.env.LIVE_SOCIAL_PUBLISH_ENABLED;
    } else {
      process.env.LIVE_SOCIAL_PUBLISH_ENABLED = oldFlag;
    }
  }
});
