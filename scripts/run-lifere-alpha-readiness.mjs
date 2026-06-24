#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE alpha readiness — machine gate for founder alpha testing.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function resolveBaseUrl() {
  if (process.env.LIFERE_ALPHA_BASE_URL) return process.env.LIFERE_ALPHA_BASE_URL.replace(/\/$/, '');
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const d = process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${d}`;
  }
  return 'https://robust-magic-production.up.railway.app';
}

const BASE = resolveBaseUrl();

const report = {
  schema: 'lifere_alpha_readiness_v1',
  mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
  at: new Date().toISOString(),
  checks: {},
  passed: [],
  failed: [],
  warnings: [],
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function runNpm(script) {
  return spawnSync('npm', ['run', script], { cwd: ROOT, encoding: 'utf8' });
}

for (const script of ['lifeos:lifere-alpha-gate', 'lifeos:lifere-self-audit']) {
  const r = runNpm(script);
  report.checks[script] = { exit: r.status };
  step(`AR-${script}`, r.status === 0, r.stderr?.slice(-300));
}

const verdict = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/OBJECTIVE_VERDICT.json'),
  'utf8',
));
step('AR-v1_acceptance_pass', ['TECHNICAL_PASS', 'PASS'].includes(String(verdict.verdict || '').toUpperCase()));

const markers = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-lifere.html'), 'utf8');
for (const [id, pattern] of [
  ['AR-ui_daily', /data-lifere="daily-command-center"/],
  ['AR-ui_top3', /data-lifere="top-3-priorities"/],
  ['AR-ui_debrief', /data-lifere="nightly-debrief"/],
  ['AR-ui_chair', /data-lifere="chair-brief"/],
  ['AR-ui_deals', /data-lifere="tc-deal-detail"/],
  ['AR-ui_content_brief', /data-lifere="content-brief"/],
  ['AR-ui_alpha_banner', /data-lifere="alpha-ready-banner"/],
]) {
  step(id, pattern.test(markers));
}

const routes = fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8');
step('AR-routes_alpha_readiness', routes.includes('/alpha/readiness'));
step('AR-routes_alpha_confirm', routes.includes('/alpha/confirm-usability'));
step('AR-routes_outreach_execute', routes.includes('/outreach/execute'));
step('AR-routes_deal_detail', routes.includes('getDealDetail'));
step('AR-routes_alpha_cycle', routes.includes('/alpha/daily-cycle'));

if (BASE) {
  const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
  if (key) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/run-lifere-alpha-e2e.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, LIFERE_ALPHA_BASE_URL: BASE },
    });
    report.checks.live_e2e = { exit: r.status, base: BASE };
    step('AR-live_e2e', r.status === 0, r.stdout?.slice(-200));

    const liveHtml = await fetch(`${BASE}/overlay/lifeos-lifere.html`);
    const htmlText = await liveHtml.text();
    step('AR-live_alpha_banner_html', liveHtml.status === 200 && htmlText.includes('data-lifere="alpha-ready-banner"'));

    const liveReady = await fetch(`${BASE}/api/v1/lifere/alpha/readiness`, { headers: { 'x-command-key': key } });
    const liveReadyJson = await liveReady.json().catch(() => ({}));
    step(
      'AR-live_alpha_readiness_api',
      liveReady.status === 200 && liveReadyJson.ready_for_alpha_testing === true,
      `status ${liveReady.status}`,
    );

    const deep = await fetch(`${BASE}/api/v1/lifere/health/deep`, { headers: { 'x-command-key': key } });
    const deepJson = await deep.json().catch(() => ({}));
    report.checks.live_pg_deep = deepJson;
    step('AR-live_pg_deep', deep.status === 200 && deepJson.pool === true);
  } else {
    report.warnings.push({ id: 'AR-W01', detail: 'LIFERE_ALPHA_BASE_URL set but no COMMAND_CENTER_KEY — skip live E2E' });
  }
} else {
  report.warnings.push({ id: 'AR-W02', detail: 'Set LIFERE_ALPHA_BASE_URL for live E2E in readiness run' });
}

if (verdict.founder_usability_pass !== true) {
  report.warnings.push({
    id: 'AR-W03',
    detail: 'founder_usability_pass false — ready for alpha TESTING but not Alpha gate closed',
  });
}

report.ok = report.failed.length === 0;
report.ready_for_alpha_testing = report.ok;
report.ready_for_alpha_gate = report.ok && verdict.founder_usability_pass === true;
report.alpha_ready = report.ready_for_alpha_testing;
report.canonical_url = '/overlay/lifeos-app.html?page=lifeos-lifere.html';
report.founder_close_path = 'Run Alpha Daily Cycle → Confirm Alpha PASS (12+ char quote) in LifeRE banner';

const out = path.join(ROOT, 'products/receipts/LIFERE_ALPHA_READINESS.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
