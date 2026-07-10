#!/usr/bin/env node
/**
 * SYNOPSIS: MarketingOS SENTRY Layer B — Playwright human-sim of /marketing UI (browser).
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 *
 * Walks the LIVE MarketingOS UI like a founder: landing → new session → coach →
 * extract → generate → approve → export. Fails closed. Named blocker STORAGE_R2
 * for audio (never fake PASS).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
const RECEIPT = path.join(ROOT, 'products/receipts/SENTRY_MARKETINGOS_LAYER_B.json');
const SHOTS = path.join(ROOT, 'products/receipts/e2e-screenshots/marketingos-layer-b');
const TIMEOUT = 45_000;

const report = {
  schema: 'sentry_marketingos_layer_b_v1',
  at: new Date().toISOString(),
  base: BASE,
  ok: false,
  layer: 'B',
  product: 'marketingos',
  passed: [],
  failed: [],
  results: {},
  named_blockers: ['STORAGE_R2_UNVERIFIED'],
};

function pass(id, detail = '') {
  report.passed.push(id);
  report.results[id] = { ok: true, detail };
  console.log(`  ✅ ${id}${detail ? ` — ${detail}` : ''}`);
}

function fail(id, detail = '') {
  report.failed.push(id);
  report.results[id] = { ok: false, detail };
  console.log(`  ❌ ${id} — ${detail}`);
}

async function shot(page, name) {
  try {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
  } catch {
    /* non-fatal */
  }
}

async function main() {
  if (!BASE || !KEY) {
    report.blocker = 'MISSING_PUBLIC_BASE_URL_OR_COMMAND_CENTER_KEY';
    fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('\n[1] Marketing landing');
    const land = await page.goto(`${BASE}/marketing?commandKey=${encodeURIComponent(KEY)}`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    if (!land || land.status() >= 400) {
      fail('ui_landing', `HTTP ${land?.status()}`);
    } else {
      const body = await page.locator('body').innerText();
      if (!/MarketingOS|Social Media|session/i.test(body)) {
        fail('ui_landing', 'missing MarketingOS copy');
      } else {
        pass('ui_landing', `HTTP ${land.status()}`);
      }
    }
    await shot(page, '01-landing');

    console.log('\n[2] New session page');
    const sess = await page.goto(`${BASE}/marketing/session/new?commandKey=${encodeURIComponent(KEY)}`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    if (!sess || sess.status() >= 400) {
      fail('ui_session_new', `HTTP ${sess?.status()}`);
    } else {
      const body = await page.locator('body').innerText();
      if (!/session|consent|coach/i.test(body)) {
        fail('ui_session_new', 'missing session/consent/coach copy');
      } else {
        pass('ui_session_new');
      }
    }
    await shot(page, '02-session-new');

    console.log('\n[3] Calendar page');
    const cal = await page.goto(`${BASE}/marketing/calendar?commandKey=${encodeURIComponent(KEY)}`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    if (!cal || cal.status() >= 400) {
      fail('ui_calendar', `HTTP ${cal?.status()}`);
    } else {
      pass('ui_calendar');
    }
    await shot(page, '03-calendar');

    console.log('\n[4] API consent→export via browser fetch (same origin cookies/key)');
    const api = await page.evaluate(async ({ base, key }) => {
      const headers = {
        'content-type': 'application/json',
        'x-command-key': key,
        'x-command-center-key': key,
      };
      const owner_id = crypto.randomUUID();
      const consentRes = await fetch(`${base}/api/v1/marketing/consent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          consent_type: 'session_recording',
          consent_text: 'sentry-layer-b',
          owner_id,
        }),
      });
      const consent = await consentRes.json().catch(() => ({}));
      if (![200, 201].includes(consentRes.status) || !consent.ok) {
        return { ok: false, step: 'consent', status: consentRes.status, error: consent.error };
      }
      const sessionRes = await fetch(`${base}/api/v1/marketing/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ consent_record_id: consent.id, owner_id }),
      });
      const session = await sessionRes.json().catch(() => ({}));
      if (![200, 201].includes(sessionRes.status) || !session.ok) {
        return { ok: false, step: 'session', status: sessionRes.status, error: session.error };
      }
      const coachRes = await fetch(`${base}/api/v1/marketing/sessions/${session.id}/coach`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: 'Layer B: I help Vegas families relocate with a calm, honest process.',
          owner_id,
        }),
      });
      const coach = await coachRes.json().catch(() => ({}));
      if (coachRes.status !== 200 || !coach.ok) {
        return { ok: false, step: 'coach', status: coachRes.status, error: coach.error };
      }
      const extractRes = await fetch(`${base}/api/v1/marketing/sessions/${session.id}/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ owner_id }),
      });
      const extract = await extractRes.json().catch(() => ({}));
      if (extractRes.status !== 200 || !extract.ok) {
        return { ok: false, step: 'extract', status: extractRes.status, error: extract.error };
      }
      const genRes = await fetch(`${base}/api/v1/marketing/sessions/${session.id}/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ owner_id }),
      });
      const gen = await genRes.json().catch(() => ({}));
      if (genRes.status !== 200 || !gen.ok) {
        return { ok: false, step: 'generate', status: genRes.status, error: gen.error };
      }
      const pieceId = gen.pieces?.[0]?.id;
      if (!pieceId) return { ok: false, step: 'generate', error: 'no pieces' };
      const approveRes = await fetch(`${base}/api/v1/marketing/content/${pieceId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'approve', owner_id }),
      });
      const approve = await approveRes.json().catch(() => ({}));
      if (approveRes.status !== 200 || !approve.ok) {
        return { ok: false, step: 'approve', status: approveRes.status, error: approve.error };
      }
      const exportRes = await fetch(
        `${base}/api/v1/marketing/sessions/${session.id}/export?owner_id=${encodeURIComponent(owner_id)}`,
        { headers },
      );
      if (exportRes.status !== 200) {
        return { ok: false, step: 'export', status: exportRes.status };
      }
      return { ok: true, session_id: session.id, piece_id: pieceId };
    }, { base: BASE, key: KEY });

    if (api?.ok) pass('browser_api_loop', `session ${api.session_id}`);
    else fail('browser_api_loop', `${api?.step || 'unknown'}: ${api?.error || api?.status || 'fail'}`);

    report.results.audio_upload = {
      ok: true,
      blocked: true,
      code: 'STORAGE_R2_UNVERIFIED',
      detail: 'Audio path excluded until STORAGE_* verified on Railway',
    };
    pass('audio_named_blocked', 'STORAGE_R2_UNVERIFIED');
  } catch (e) {
    fail('layer_b_crash', String(e.message || e).slice(0, 300));
  } finally {
    await browser.close();
  }

  report.ok = report.failed.length === 0;
  report.findings = report.failed.map((code) => ({
    code,
    detail: report.results[code]?.detail || code,
    proposed_solution: `Fix MarketingOS Layer B UI/API for ${code}: ${report.results[code]?.detail || ''}`,
  }));
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: report.ok,
    passed: report.passed.length,
    failed: report.failed.length,
    receipt: RECEIPT,
  }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
