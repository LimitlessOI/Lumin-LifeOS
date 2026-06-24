#!/usr/bin/env node
/**
 * SYNOPSIS: Live probe — doctrine artifacts + LifeRE stack endpoints on Railway.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.LIFERE_ALPHA_BASE_URL || process.env.BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
const EXPECT_SHA_PREFIX = (process.env.EXPECT_SHA || '490d25da1c').slice(0, 12);

const report = {
  schema: 'lifeos_doctrine_live_probe_v1',
  at: new Date().toISOString(),
  base: BASE,
  passed: [],
  failed: [],
  warnings: [],
};

function pass(id, detail = '') {
  report.passed.push({ id, detail });
}

function fail(id, detail) {
  report.failed.push({ id, detail });
}

function warn(id, detail) {
  report.warnings.push({ id, detail });
}

async function get(path, auth = false) {
  const headers = {};
  if (auth && KEY) headers['x-command-key'] = KEY;
  const res = await fetch(`${BASE}${path}`, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, text, json };
}

async function main() {
  const lifereHtml = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-lifere.html'), 'utf8');
  for (const [id, ok, detail] of [
    ['LOCAL-doctrine_service', fs.existsSync(path.join(ROOT, 'services/lifeos-service-doctrine.js')), ''],
    ['LOCAL-doctrine_doc', fs.existsSync(path.join(ROOT, 'docs/LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE.md')), ''],
    ['LOCAL-lifere_theme_overrides', /lifeos-theme-overrides\.css/.test(lifereHtml), ''],
    ['LOCAL-lifere_theme_toggle', /lifere-theme-toggle/.test(lifereHtml), ''],
    ['LOCAL-lifere_shell_hint', /lifeos-app\.html\?page=lifeos-lifere/.test(lifereHtml), ''],
    ['LOCAL-content_brief_ui', /data-lifere="content-brief"/.test(lifereHtml), ''],
    ['LOCAL-personal_twin_v2', (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/twins/default/adam/personal.json'))).schema === 'lifeos_personal_twin_v2'; } catch { return false; } })(), ''],
  ]) {
    ok ? pass(id) : fail(id, detail || 'missing');
  }

  const ready = await get('/api/v1/lifeos/builder/ready', Boolean(KEY));
  const deploySha = ready.json?.codegen?.deploy_commit_sha || ready.json?.deploy_commit_sha || '';
  if (deploySha.startsWith(EXPECT_SHA_PREFIX)) pass('LIVE-deploy_sha', deploySha.slice(0, 12));
  else warn('LIVE-deploy_sha', `got ${deploySha.slice(0, 12) || 'none'} expected ${EXPECT_SHA_PREFIX}`);

  const liveLifere = await get('/overlay/lifeos-lifere.html');
  if (liveLifere.status === 200) {
    pass('LIVE-lifere_html', String(liveLifere.status));
    for (const [id, pat] of [
      ['LIVE-html_theme_overrides', /lifeos-theme-overrides\.css/],
      ['LIVE-html_theme_toggle', /lifere-theme-toggle/],
      ['LIVE-html_shell_hint', /lifeos-app\.html\?page=lifeos-lifere/],
      ['LIVE-html_theme_js', /lifeos-theme\.js/],
    ]) {
      pat.test(liveLifere.text) ? pass(id) : fail(id, 'not in live HTML');
    }
  } else fail('LIVE-lifere_html', `status ${liveLifere.status}`);

  const endpoints = [
    ['/api/v1/lifere/health', true],
    ['/api/v1/lifere/health/deep', true],
    ['/api/v1/lifere/transaction/list', true],
    ['/api/v1/lifere/outreach/queue?user_id=adam', true],
    ['/api/v1/lifere/marketing/socialmediaos/status', true],
    ['/api/v1/lifere/daily-command-center', true, 'POST', { user_id: 'adam' }],
    ['/api/v1/lifere/marketing/socialmediaos/coach', true, 'POST', { user_id: 'adam', message: 'probe' }],
  ];

  let approvedBriefId = null;
  if (KEY) {
    const bg = await fetch(`${BASE}/api/v1/lifere/marketing/content-brief/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
      body: JSON.stringify({ user_id: 'adam', topic: 'probe coach gate' }),
    });
    const bj = await bg.json().catch(() => ({}));
    if (bj.brief_id) {
      approvedBriefId = bj.brief_id;
      await fetch(`${BASE}/api/v1/lifere/marketing/content-brief/${bj.brief_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
        body: JSON.stringify({ user_id: 'adam' }),
      });
    }
  }

  for (const [route, needsAuth, method = 'GET', bodyObj] of endpoints) {
    const id = `LIVE-${route.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}`;
    if (needsAuth && !KEY) {
      warn(id, 'skipped — no COMMAND_CENTER_KEY');
      continue;
    }
    const headers = { 'Content-Type': 'application/json' };
    if (needsAuth && KEY) headers['x-command-key'] = KEY;
    const body = { ...(bodyObj || {}) };
    if (route.includes('socialmediaos/coach') && approvedBriefId) body.brief_id = approvedBriefId;
    const res = await fetch(`${BASE}${route}`, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 200 && json?.ok !== false) pass(id, String(res.status));
    else if (res.status === 401 && !KEY) warn(id, '401 without key');
    else fail(id, `status ${res.status} ${JSON.stringify(json).slice(0, 120)}`);
  }

  const smo = await get('/api/v1/lifere/marketing/socialmediaos/status', Boolean(KEY));
  if (smo.json?.doctrine?.includes('LIFEOS_SERVICE')) pass('LIVE-smo_doctrine_ref');
  else if (smo.status === 200) warn('LIVE-smo_doctrine_ref', 'doctrine field missing — deploy may be stale');
  if (smo.json?.brief_gate) pass('LIVE-smo_brief_gate');

  if (KEY) {
    const briefGen = await fetch(`${BASE}/api/v1/lifere/marketing/content-brief/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
      body: JSON.stringify({ user_id: 'adam', topic: 'live probe brief topic' }),
    });
    const briefJson = await briefGen.json().catch(() => ({}));
    if (briefGen.status === 200 && briefJson.brief_id) {
      pass('LIVE-content_brief_generate', String(briefJson.brief_id));
      const approve = await fetch(`${BASE}/api/v1/lifere/marketing/content-brief/${briefJson.brief_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
        body: JSON.stringify({ user_id: 'adam' }),
      });
      if (approve.status === 200) pass('LIVE-content_brief_approve');
      else fail('LIVE-content_brief_approve', `status ${approve.status}`);
    } else fail('LIVE-content_brief_generate', `status ${briefGen.status}`);
  } else {
    warn('LIVE-content_brief', 'skipped — no COMMAND_CENTER_KEY');
  }

  report.ok = report.failed.length === 0;
  const out = path.join(ROOT, 'products/receipts/LIFEOS_DOCTRINE_LIVE_PROBE.json');
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, passed: report.passed.length, failed: report.failed.length, warnings: report.warnings.length, out }, null, 2));
  if (report.failed.length) {
    console.error(report.failed);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
