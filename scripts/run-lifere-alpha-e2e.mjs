#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE Alpha E2E — founder success test at API layer (daily + top-3 + debrief).
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createLifeRERoutes } from '../routes/lifere-os-routes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.LIFERE_ALPHA_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || 'alpha-e2e-local';
const USE_LIVE = Boolean(BASE);

const report = {
  schema: 'lifere_alpha_e2e_v1',
  mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
  at: new Date().toISOString(),
  mode: USE_LIVE ? 'live' : 'in_process',
  passed: [],
  failed: [],
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function fileContains(rel, pattern) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) return false;
  return pattern.test(fs.readFileSync(fp, 'utf8'));
}

step('LRE-E2E-T01_daily_marker', fileContains('public/overlay/lifeos-lifere.html', /data-lifere="daily-command-center"/));
step('LRE-E2E-T02_top3_marker', fileContains('public/overlay/lifeos-lifere.html', /data-lifere="top-3-priorities"/));
step('LRE-E2E-T03_debrief_marker', fileContains('public/overlay/lifeos-lifere.html', /data-lifere="nightly-debrief"/));
step('LRE-E2E-T04_app_nav', fileContains('public/overlay/lifeos-app.html', /lifeos-lifere\.html/));

async function request(baseUrl, method, routePath, body) {
  const headers = { 'Content-Type': 'application/json', 'x-command-key': KEY };
  const res = await fetch(`${baseUrl}${routePath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function startLocalApp() {
  const app = express();
  app.use(express.json());
  const requireKey = (req, res, next) => {
    const k = req.headers['x-command-key'];
    if (!k) return res.status(401).json({ ok: false, error: 'key required' });
    next();
  };
  app.use('/api/v1/lifere', createLifeRERoutes({ requireKey, pool: null }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function runApiCycle(baseUrl) {
  const health = await request(baseUrl, 'GET', '/api/v1/lifere/health');
  step('LRE-E2E-T05_health', health.status === 200 && health.json?.ok !== false, JSON.stringify(health.json));

  const daily = await request(baseUrl, 'POST', '/api/v1/lifere/daily-command-center', { user_id: 'adam' });
  const result = daily.json?.result;
  const hasDaily = Boolean(
    result?.daily_focus?.length || result?.top_3_priorities?.length || result?.chair?.next_action,
  );
  step('LRE-E2E-T06_daily_command_center', daily.status === 200 && hasDaily, JSON.stringify(daily.json).slice(0, 200));

  const top3 = await request(baseUrl, 'GET', '/api/v1/lifere/top-3?user_id=adam');
  const priorities = top3.json?.result?.priorities || top3.json?.result?.focus;
  step('LRE-E2E-T07_top3', top3.status === 200 && Array.isArray(priorities) && priorities.length >= 1, JSON.stringify(top3.json).slice(0, 200));

  const debrief = await request(baseUrl, 'POST', '/api/v1/lifere/nightly-debrief', {
    user_id: 'adam',
    wins: ['Logged activity'],
    losses: [],
    notes: 'Alpha e2e debrief',
  });
  const debriefBody = debrief.json?.result?.summary || debrief.json?.result?.debrief || debrief.json?.result;
  step('LRE-E2E-T08_nightly_debrief', debrief.status === 200 && Boolean(debriefBody), JSON.stringify(debrief.json).slice(0, 200));

  const brief = await request(baseUrl, 'GET', '/api/v1/lifere/chair/brief?user_id=adam');
  step('LRE-E2E-T09_chair_brief', brief.status === 200 && brief.json?.what_should_i_do_next != null);
}

let local;
try {
  const baseUrl = USE_LIVE ? BASE : (local = await startLocalApp()).baseUrl;
  await runApiCycle(baseUrl);
} finally {
  if (local) await local.close();
}

report.ok = report.failed.length === 0;
report.founder_success_test = 'Open lifeos-app LifeRE path; daily command center + top-3 + debrief visible';
report.founder_usability_pass = false;
report.note = 'Machine E2E PASS does not set founder_usability_pass — Adam confirm required for Alpha gate';

const out = path.join(ROOT, 'products/receipts/LIFERE_ALPHA_E2E.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
