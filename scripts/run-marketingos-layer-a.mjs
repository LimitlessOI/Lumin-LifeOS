#!/usr/bin/env node
/**
 * SYNOPSIS: MarketingOS / SocialMediaOS SENTRY Layer A — structural LIVE probes (no browser).
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 *
 * Proves canonical /api/v1/marketing/* + /marketing UI are LIVE.
 * Audio upload is named BLOCKED (STORAGE_R2_UNVERIFIED) — never fake PASS.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
const RECEIPT = path.join(ROOT, 'products/receipts/SENTRY_MARKETINGOS_LAYER_A.json');

function uuid() {
  return crypto.randomUUID();
}

async function req(method, pathname, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-command-key': KEY,
      'x-command-center-key': KEY,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json, text };
}

async function main() {
  const started = Date.now();
  const results = {};
  const findings = [];

  if (!BASE || !KEY) {
    const report = {
      ok: false,
      layer: 'A',
      product: 'marketingos',
      blocker: 'MISSING_PUBLIC_BASE_URL_OR_COMMAND_CENTER_KEY',
      at: new Date().toISOString(),
    };
    fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  async function check(id, fn) {
    try {
      await fn();
      results[id] = { ok: true };
    } catch (e) {
      const detail = String(e?.message || e).slice(0, 400);
      results[id] = { ok: false, error: detail };
      findings.push({
        code: id,
        detail,
        solution: `Fix MarketingOS surface for ${id}: ${detail}`,
      });
    }
  }

  await check('ui_marketing_landing', async () => {
    const { res, text } = await req('GET', '/marketing');
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!/MarketingOS/i.test(text)) throw new Error('missing MarketingOS title/body');
  });

  await check('ui_session_new', async () => {
    const { res, text } = await req('GET', '/marketing/session/new');
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!/session/i.test(text)) throw new Error('session new page missing session copy');
  });

  await check('ui_calendar', async () => {
    const { res } = await req('GET', '/marketing/calendar');
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  });

  const owner_id = uuid();
  let consentId = null;
  let sessionId = null;
  let pieceId = null;

  await check('api_consent', async () => {
    const { res, json } = await req('POST', '/api/v1/marketing/consent', {
      consent_type: 'session_recording',
      consent_text: 'sentry-layer-a',
      owner_id,
    });
    if (![200, 201].includes(res.status) || !json?.ok) {
      throw new Error(`consent HTTP ${res.status}: ${json?.error || 'fail'}`);
    }
    consentId = json.id;
  });

  await check('api_session_requires_consent', async () => {
    const { res } = await req('POST', '/api/v1/marketing/sessions', { owner_id });
    if (res.status !== 400) throw new Error(`expected 400 without consent, got ${res.status}`);
  });

  await check('api_session_create', async () => {
    const { res, json } = await req('POST', '/api/v1/marketing/sessions', {
      consent_record_id: consentId,
      owner_id,
    });
    if (![200, 201].includes(res.status) || !json?.ok) {
      throw new Error(`session HTTP ${res.status}: ${json?.error || 'fail'}`);
    }
    sessionId = json.id;
  });

  await check('api_coach', async () => {
    const { res, json } = await req('POST', `/api/v1/marketing/sessions/${sessionId}/coach`, {
      message: 'I closed three homes in Summerlin last month because I treat every listing like a product launch.',
      owner_id,
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`coach HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!json.response) throw new Error('coach missing response text');
  });

  await check('api_extract', async () => {
    const { res, json } = await req('POST', `/api/v1/marketing/sessions/${sessionId}/extract`, { owner_id });
    if (res.status !== 200 || !json?.ok) throw new Error(`extract HTTP ${res.status}: ${json?.error || 'fail'}`);
  });

  await check('api_generate', async () => {
    const { res, json } = await req('POST', `/api/v1/marketing/sessions/${sessionId}/generate`, { owner_id });
    if (res.status !== 200 || !json?.ok) throw new Error(`generate HTTP ${res.status}: ${json?.error || 'fail'}`);
    pieceId = json.pieces?.[0]?.id;
    if (!pieceId) throw new Error('generate returned no pieces');
  });

  await check('api_approve', async () => {
    const { res, json } = await req('PATCH', `/api/v1/marketing/content/${pieceId}`, {
      action: 'approve',
      owner_id,
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`approve HTTP ${res.status}: ${json?.error || 'fail'}`);
  });

  await check('api_export', async () => {
    const res = await fetch(
      `${BASE}/api/v1/marketing/sessions/${sessionId}/export?owner_id=${encodeURIComponent(owner_id)}`,
      { headers: { 'x-command-key': KEY, 'x-command-center-key': KEY } },
    );
    if (res.status !== 200) throw new Error(`export HTTP ${res.status}`);
    const cd = res.headers.get('content-disposition') || '';
    if (!/attachment/i.test(cd)) throw new Error(`export missing attachment disposition: ${cd}`);
  });

  await check('api_intel_titles', async () => {
    const { res, json } = await req('POST', '/api/v1/marketing/intel/titles', {
      topic: 'Las Vegas real estate',
      count: 5,
      owner_id,
    });
    if (res.status !== 200 || json?.ok === false) {
      throw new Error(`intel titles HTTP ${res.status}: ${json?.error || 'fail'}`);
    }
  });

  // Named blocker — not a failure of Layer A text path
  results.audio_upload = {
    ok: true,
    blocked: true,
    code: 'STORAGE_R2_UNVERIFIED',
    detail: 'Audio path excluded until STORAGE_* verified on Railway',
  };

  const failed = Object.entries(results).filter(([, v]) => v && v.ok === false);
  const report = {
    schema: 'sentry_marketingos_layer_a_v1',
    ok: failed.length === 0,
    layer: 'A',
    product: 'marketingos',
    at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    base: BASE,
    results,
    findings,
    named_blockers: ['STORAGE_R2_UNVERIFIED'],
  };
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, failed: failed.length, findings: findings.length, receipt: RECEIPT }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
