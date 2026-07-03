#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE full audit — machine + live + wiring report.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolvePublicBaseUrl } from '../config/public-origin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = resolvePublicBaseUrl(process.env.LIFERE_ALPHA_BASE_URL, process.env.PUBLIC_BASE_URL);
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'lifere_full_audit_v1',
  at: new Date().toISOString(),
  base: BASE,
  machine: {},
  live: {},
  wiring: {},
  gaps: [],
  fixed_this_run: [],
  passed: [],
  failed: [],
  warnings: [],
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function warn(id, detail) {
  report.warnings.push({ id, detail });
}

function runNpm(script) {
  return spawnSync('npm', ['run', script], { cwd: ROOT, encoding: 'utf8', env: process.env });
}

for (const script of ['lifeos:lifere-alpha-readiness', 'lifeos:lifere-self-audit', 'lifeos:service-doctrine:verify']) {
  const r = runNpm(script);
  report.machine[script] = r.status;
  step(`MACHINE-${script}`, r.status === 0, r.stderr?.slice(-200));
}

const routes = fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8');
const smoBridge = fs.readFileSync(path.join(ROOT, 'services/lifere-socialmediaos-bridge.js'), 'utf8');
const appHtml = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-app.html'), 'utf8');

step('WIRE-smo_council_signature', /callCouncilMember\('anthropic', prompt/.test(smoBridge));
step('WIRE-context_router_api', routes.includes('/alpha/readiness') && appHtml.includes('lifeosSetContextIntent'));
step('WIRE-vapi_secret_gate', routes.includes('VAPI_WEBHOOK_SECRET'));
step('WIRE-boot_adam_user', fs.readFileSync(path.join(ROOT, 'services/lifere-boot.js'), 'utf8').includes("VALUES ('adam'"));

if (KEY) {
  const headers = { 'x-command-key': KEY, 'Content-Type': 'application/json' };
  const probes = [
    ['GET', '/api/v1/lifere/alpha/readiness', null, (j) => j.ready_for_alpha_testing === true],
    ['GET', '/api/v1/lifeos/context/suggest?q=lifere+gci', null, (j) => j.stack_id === 'lifere'],
    ['GET', '/api/v1/lifere/outreach/queue?user_id=adam', null, (j) => j.ok === true],
    ['POST', '/api/v1/lifere/marketing/content-brief/generate', { user_id: 'adam', topic: 'audit probe' }, (j) => j.brief_id],
  ];
  for (const [method, route, body, pred] of probes) {
    const id = `LIVE-${route.split('?')[0].replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}`;
    try {
      const res = await fetch(`${BASE}${route}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      step(id, res.status === 200 && pred(json), `status ${res.status}`);
      report.live[id] = { status: res.status, ok: json.ok };
    } catch (err) {
      step(id, false, err.message);
    }
  }

  const htmlRes = await fetch(`${BASE}/overlay/lifeos-lifere.html`);
  const html = await htmlRes.text();
  step('LIVE-alpha_banner', html.includes('data-lifere="alpha-ready-banner"'));
}

const gapReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'products/receipts/LIFERE_CODER_GAP_REPORT.json'), 'utf8'));
for (const g of gapReport.gaps_remaining || []) {
  if (g.not_coder_scope) warn(`GAP-${g.id}`, g.issue);
  else report.gaps.push(g);
}

report.ok = report.failed.length === 0;
report.alpha_ready = report.ok;
report.founder_blocker = report.warnings.some((w) => w.id === 'GAP-GAP-07') || true;

const out = path.join(ROOT, 'products/receipts/LIFERE_FULL_AUDIT.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
