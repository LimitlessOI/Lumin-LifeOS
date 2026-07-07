/**
 * SYNOPSIS: MarketingOS Phase 1 route/schema contract regression.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { registerMarketingSessionRoutes } from '../routes/marketing-session-routes.js';
import { registerMarketingSessionUiRoutes } from '../routes/marketing-session-ui-routes.js';

class MarketingPool {
  constructor() {
    this.consent = [];
    this.sessions = [];
    this.extractions = [];
    this.pieces = [];
    this.profiles = [];
  }

  async query(sql, params = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    if (/insert into marketing_content_extractions/i.test(sql) && /\bowner_id\b/i.test(sql)) {
      throw new Error('schema_contract_violation: marketing_content_extractions has no owner_id column');
    }
    if (/insert into marketing_content_pieces/i.test(sql) && /\b(owner_id|source_extraction_id)\b/i.test(sql)) {
      throw new Error('schema_contract_violation: marketing_content_pieces uses extraction_id and has no owner_id');
    }

    if (normalized.startsWith('insert into marketing_consent_records')) {
      const row = { id: randomUUID(), owner_id: params[0], consent_type: params[1], consent_text: params[2], ip_address: params[3], revoked_at: null, session_id: null };
      assert.equal(row.consent_type, 'session_recording');
      this.consent.push(row);
      return { rows: [{ id: row.id }] };
    }
    if (normalized.startsWith('select id from marketing_consent_records')) {
      return { rows: this.consent.filter((r) => r.id === params[0] && r.owner_id === params[1] && !r.revoked_at).map((r) => ({ id: r.id })) };
    }
    if (normalized.startsWith('update marketing_consent_records set session_id')) {
      const row = this.consent.find((r) => r.id === params[1] && r.owner_id === params[2]);
      if (row) row.session_id = params[0];
      return { rows: row ? [row] : [] };
    }
    if (normalized.startsWith('insert into marketing_sessions')) {
      const row = {
        id: randomUUID(),
        owner_id: params[0],
        consent_record_id: params[1],
        input_mode: params[2],
        session_type: params[3],
        status: params[4],
        coach_messages_json: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5],
        created_at: new Date().toISOString(),
      };
      assert.equal(row.input_mode, 'text');
      assert.equal(row.session_type, 'coaching');
      this.sessions.push(row);
      return { rows: [row] };
    }
    if (normalized.startsWith('select coach_messages_json from marketing_sessions')) {
      const row = this.sessions.find((r) => r.id === params[0] && r.owner_id === params[1]);
      return { rows: row ? [{ coach_messages_json: row.coach_messages_json }] : [] };
    }
    if (normalized.startsWith('select id from marketing_sessions')) {
      const row = this.sessions.find((r) => r.id === params[0] && r.owner_id === params[1]);
      return { rows: row ? [{ id: row.id }] : [] };
    }
    if (normalized.startsWith('select * from marketing_sessions')) {
      const row = this.sessions.find((r) => r.id === params[0] && r.owner_id === params[1]);
      return { rows: row ? [row] : [] };
    }
    if (normalized.startsWith('update marketing_sessions set coach_messages_json')) {
      const row = this.sessions.find((r) => r.id === params[1] && r.owner_id === params[2]);
      if (row) row.coach_messages_json = JSON.parse(params[0]);
      return { rows: row ? [row] : [] };
    }
    if (normalized.startsWith("update marketing_sessions set status = 'extracting'")) {
      return this.updateSessionStatus(params[0], params[1], 'extracting');
    }
    if (normalized.startsWith("update marketing_sessions set status = 'generating'")) {
      return this.updateSessionStatus(params[0], params[1], 'generating');
    }
    if (normalized.startsWith('update marketing_sessions set extraction_run_at')) {
      return this.updateSessionField(params[0], params[1], { extraction_run_at: new Date().toISOString() });
    }
    if (normalized.startsWith("update marketing_sessions set status = 'completed'")) {
      return this.updateSessionStatus(params[0], params[1], 'completed');
    }
    if (normalized.startsWith('insert into marketing_content_extractions')) {
      const row = { id: randomUUID(), session_id: params[0], extraction_type: params[1], raw_text: params[2], confidence_score: params[3], source_quote: params[4] };
      assert.equal(row.extraction_type, 'hook');
      this.extractions.push(row);
      return { rows: [row] };
    }
    if (normalized.startsWith('select * from marketing_content_extractions')) {
      return { rows: this.extractions.filter((r) => r.session_id === params[0]) };
    }
    if (normalized.startsWith('select brand_voice_json from marketing_channel_profiles')) {
      return { rows: this.profiles.filter((r) => r.owner_id === params[0]).map((r) => ({ brand_voice_json: r.brand_voice_json })) };
    }
    if (normalized.startsWith('insert into marketing_content_pieces')) {
      const row = {
        id: randomUUID(),
        session_id: params[0],
        extraction_id: params[1],
        platform: params[2],
        format: params[3],
        content_text: params[4],
        status: params[5],
        generated_by_model: params[6],
        regeneration_count: 0,
        created_at: new Date().toISOString(),
      };
      assert.equal(row.platform, 'linkedin');
      assert.equal(row.format, 'post');
      this.pieces.push(row);
      return { rows: [row] };
    }
    if (normalized.startsWith('select p.* from marketing_content_pieces')) {
      if (normalized.includes('where p.id =')) {
        return { rows: this.pieces.filter((p) => p.id === params[0] && this.sessionOwner(p.session_id) === params[1]) };
      }
      return { rows: this.pieces.filter((p) => p.session_id === params[0] && this.sessionOwner(p.session_id) === params[1]) };
    }
    if (normalized.startsWith("update marketing_content_pieces set status = 'approved'")) {
      return this.updatePieceStatus(params[0], params[1], 'approved');
    }
    if (normalized.startsWith("update marketing_content_pieces set status = 'rejected'")) {
      return this.updatePieceStatus(params[0], params[1], 'rejected');
    }
    if (normalized.startsWith('select p.platform, p.format, p.content_text')) {
      return { rows: this.pieces.filter((p) => p.session_id === params[0] && this.sessionOwner(p.session_id) === params[1] && p.status === 'approved') };
    }
    if (normalized.startsWith('select * from marketing_channel_profiles')) return { rows: [] };
    if (normalized.startsWith('insert into marketing_channel_profiles')) {
      const row = { id: randomUUID(), owner_id: params[0], channel_name: params[1], niche: params[2], brand_voice_json: JSON.parse(params[3]), audience_json: JSON.parse(params[4]), posting_cadence_json: JSON.parse(params[5]) };
      this.profiles.push(row);
      return { rows: [row] };
    }
    if (normalized.startsWith('update marketing_channel_profiles')) return { rows: [] };
    throw new Error(`unhandled query: ${sql}`);
  }

  sessionOwner(sessionId) {
    return this.sessions.find((s) => s.id === sessionId)?.owner_id;
  }

  updateSessionStatus(id, ownerId, status) {
    return this.updateSessionField(id, ownerId, { status });
  }

  updateSessionField(id, ownerId, fields) {
    const row = this.sessions.find((r) => r.id === id && r.owner_id === ownerId);
    if (row) Object.assign(row, fields);
    return { rows: row ? [row] : [] };
  }

  updatePieceStatus(id, ownerId, status) {
    const row = this.pieces.find((p) => p.id === id && this.sessionOwner(p.session_id) === ownerId);
    if (row) row.status = status;
    return { rows: row ? [row] : [] };
  }
}

async function withServer(register) {
  const app = express();
  app.use(express.json());
  await register(app);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function jsonFetch(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { res, body, text };
}

test('MarketingOS session API follows the Phase 1 migration schema end-to-end', async () => {
  const ownerId = randomUUID();
  const pool = new MarketingPool();
  const calls = [];
  const { baseUrl, close } = await withServer((app) => registerMarketingSessionRoutes(app, {
    pool,
    requireKey: (_req, _res, next) => next(),
    logger: { error() {}, warn() {}, info() {} },
    callCouncilMember: async (role) => {
      calls.push(role);
      if (role === 'marketing-coach') return JSON.stringify({ response: 'Tell me about the 42-hour win.', hookDetected: true, hookText: '42-hour win' });
      if (role === 'marketing-extractor') return JSON.stringify([{ extraction_type: 'hook', raw_text: 'Founders remember stories with numbers.', confidence_score: 0.91, source_quote: '42-hour win' }]);
      if (role === 'marketing-generator') return JSON.stringify({ platform: 'linkedin', format: 'post', content_text: 'Founders remember stories with numbers.' });
      throw new Error(`unexpected council role: ${role}`);
    },
  }));

  try {
    const consent = await jsonFetch(baseUrl, '/api/v1/marketing/consent', {
      method: 'POST',
      body: JSON.stringify({ owner_id: ownerId, consent_type: 'session_recording', consent_text: 'I consent.' }),
    });
    assert.equal(consent.res.status, 201);

    const session = await jsonFetch(baseUrl, '/api/v1/marketing/sessions', {
      method: 'POST',
      body: JSON.stringify({ owner_id: ownerId, consent_record_id: consent.body.id, session_type: 'coaching', input_mode: 'text' }),
    });
    assert.equal(session.res.status, 201);
    assert.equal(session.body.session_type, 'coaching');

    const coach = await jsonFetch(baseUrl, `/api/v1/marketing/sessions/${session.body.id}/coach`, {
      method: 'POST',
      body: JSON.stringify({ owner_id: ownerId, message: 'We saved a client 42 hours.' }),
    });
    assert.equal(coach.res.status, 200);
    assert.equal(coach.body.hookDetected, true);

    const extract = await jsonFetch(baseUrl, `/api/v1/marketing/sessions/${session.body.id}/extract?owner_id=${ownerId}`, { method: 'POST' });
    assert.equal(extract.res.status, 200);
    assert.equal(extract.body.extractions[0].extraction_type, 'hook');

    const generated = await jsonFetch(baseUrl, `/api/v1/marketing/sessions/${session.body.id}/generate?owner_id=${ownerId}`, { method: 'POST' });
    assert.equal(generated.res.status, 200);
    assert.equal(generated.body.pieces[0].extraction_id, extract.body.extractions[0].id);
    assert.equal(generated.body.pieces[0].platform, 'linkedin');

    const content = await jsonFetch(baseUrl, `/api/v1/marketing/sessions/${session.body.id}/content?owner_id=${ownerId}`);
    assert.equal(content.res.status, 200);
    assert.equal(content.body.pieces.length, 1);

    const approve = await jsonFetch(baseUrl, `/api/v1/marketing/content/${content.body.pieces[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({ owner_id: ownerId, action: 'approve' }),
    });
    assert.equal(approve.res.status, 200);
    assert.equal(approve.body.piece.status, 'approved');

    const exported = await fetch(`${baseUrl}/api/v1/marketing/sessions/${session.body.id}/export?owner_id=${ownerId}`);
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get('content-disposition'), /attachment/);
    assert.match(await exported.text(), /Founders remember stories with numbers/);
    assert.deepEqual(calls, ['marketing-coach', 'marketing-extractor', 'marketing-generator']);
  } finally {
    await close();
  }
});

test('MarketingOS UI emits browser-safe scripts that match the API contract', async () => {
  const { baseUrl, close } = await withServer((app) => registerMarketingSessionUiRoutes(app, {
    logger: { error() {}, warn() {}, info() {} },
  }));
  try {
    const newSession = await fetch(`${baseUrl}/marketing/session/new?owner_id=${randomUUID()}`).then((r) => r.text());
    assert.match(newSession, /marketingJsonHeaders/);
    assert.match(newSession, /consent_type: 'session_recording'/);
    assert.doesNotMatch(newSession, /logger\.error/);

    const session = await fetch(`${baseUrl}/marketing/session/session-1?owner_id=${randomUUID()}`).then((r) => r.text());
    assert.match(session, /data\.session\?\.coach_messages_json/);
    assert.match(session, /function escapeHtml/);

    const content = await fetch(`${baseUrl}/marketing/session/session-1/content?owner_id=${randomUUID()}`).then((r) => r.text());
    assert.match(content, /const contentPieces = data\.pieces \|\| \[\]/);
    assert.match(content, /body: JSON\.stringify\(withMarketingOwner\(\{ action \}\)\)/);
  } finally {
    await close();
  }
});
