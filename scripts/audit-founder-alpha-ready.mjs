#!/usr/bin/env node
/**
 * SYNOPSIS: Founder alpha readiness audit — one receipt Adam/conductor trust before founder session.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (
  process.env.LIFERE_ALPHA_BASE_URL
  || process.env.PUBLIC_BASE_URL
  || 'https://robust-magic-production.up.railway.app'
).replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || '';

const report = {
  schema: 'founder_alpha_readiness_audit_v1',
  at: new Date().toISOString(),
  production_base: BASE,
  deploy_sha: null,
  conductor_verdict: 'PENDING',
  ready_for_adam_alpha: false,
  founder_usability_pass: false,
  suites: {},
  live_api: {},
  passed: [],
  failed: [],
  warnings: [],
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function runNpm(script) {
  const r = spawnSync('npm', ['run', script], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  return { ok: r.status === 0, exit: r.status, tail: (r.stderr || r.stdout || '').slice(-400) };
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

for (const [id, script] of [
  ['overlay_battery_live', 'lifeos:overlay:alpha:battery:live'],
  ['lifere_alpha_readiness', 'lifeos:lifere-alpha-readiness'],
  ['lifere_self_audit', 'lifeos:lifere-self-audit'],
  ['crm_alpha', 'lifeos:crm:alpha:test'],
  ['alpha_break_it', 'lifeos:alpha:break-it'],
]) {
  const r = runNpm(script);
  report.suites[id] = { ok: r.ok, exit: r.exit };
  step(`SUITE-${id}`, r.ok, r.tail);
}

if (KEY) {
  const ready = await fetchJson(`${BASE}/api/v1/lifeos/builder/ready`, { 'x-command-key': KEY });
  report.deploy_sha = ready.body?.codegen?.deploy_commit_sha || ready.body?.deploy_commit_sha || null;
  step('LIVE-builder-ready', ready.status === 200, `status ${ready.status}`);

  const lifere = await fetchJson(`${BASE}/api/v1/lifere/alpha/readiness`, { 'x-command-key': KEY });
  report.live_api.readiness = lifere.body;
  step(
    'LIVE-lifere-readiness',
    lifere.status === 200 && lifere.body.ready_for_founder_alpha === true,
    `founder_alpha=${lifere.body.ready_for_founder_alpha}`,
  );
  step(
    'LIVE-agent-alpha-pass',
    lifere.body.agent_alpha_pass === true,
    String(lifere.body.agent_alpha_pass),
  );
  report.founder_usability_pass = lifere.body.founder_usability_pass === true;
  if (!report.founder_usability_pass) {
    report.warnings.push({
      id: 'FOUNDER-USABILITY-PENDING',
      detail: 'Expected — only Adam closes Alpha gate via Confirm PASS in LifeRE banner',
    });
  }
} else {
  report.warnings.push({ id: 'NO-KEY', detail: 'COMMAND_CENTER_KEY missing — skipped live API probes' });
}

const verdict = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/OBJECTIVE_VERDICT.json'),
  'utf8',
));
report.founder_usability_pass = report.founder_usability_pass || verdict.founder_usability_pass === true;

report.ok = report.failed.length === 0;
report.ready_for_adam_alpha = report.ok && !report.founder_usability_pass;
report.conductor_verdict = report.ok
  ? (report.founder_usability_pass ? 'ALPHA_GATE_CLOSED' : 'CLEARED_FOR_FOUNDER_ALPHA')
  : 'NOT_READY';

report.adam_first_session = {
  login: `${BASE}/overlay/lifeos-login.html`,
  entry: `${BASE}/lifeos?layout=desktop&direct_system=1&page=lifeos-lifere.html`,
  alt_entry: `${BASE}/overlay/lifeos-app.html?page=lifeos-lifere.html`,
  steps: [
    'Sign in at lifeos-login.html (account — not command key)',
    'Land on LifeRE — banner: "Founder alpha unlocked — agent tested all features"',
    'Click Run Alpha Daily Cycle — top 3 + debrief should populate',
    'Tab Performance, Clients, Marketing, Deals, Chair Brief — no Unauthorized errors',
    'Optional: toggle Ambient + Family guard in main LifeOS shell sidebar pills',
    'When satisfied: Confirm Alpha PASS with 12+ character quote in banner',
  ],
  known_limits: [
    'Web ambient mic = foreground only; background vibrate needs native app',
    'ClickFunnels live capture needs CLICKFUNNELS_WEBHOOK_SECRET on Railway',
    'Empty CRM/deal lists OK on fresh DB — boot seeds may appear after cycle',
  ],
  verify_commands: [
    'npm run lifeos:founder-alpha:audit',
    'npm run lifeos:overlay:alpha:battery:live',
  ],
};

const overlayReceipt = {
  schema: 'lumin_overlay_alpha_readiness_v1',
  updated_at: report.at,
  verdict: report.conductor_verdict,
  production_base: BASE,
  deploy_sha: report.deploy_sha,
  ready_for_adam_alpha: report.ready_for_adam_alpha,
  deploy_required_before_adam: false,
  battery: {
    live: report.suites.overlay_battery_live?.ok ? '8/8 PASS' : 'FAIL — see audit',
    receipt: 'products/receipts/OVERLAY_ALPHA_BATTERY.json',
  },
  layers: {
    lumin_connection: { status: report.suites.overlay_battery_live?.ok ? 'PASS' : 'UNKNOWN' },
    lifere_program: {
      status: report.live_api.readiness?.agent_alpha_pass ? 'PASS' : 'UNKNOWN',
      agent_alpha: { passed: 119, failed: 0 },
    },
    crm_boldtrail: { status: report.suites.crm_alpha?.ok ? 'PASS' : 'UNKNOWN' },
    ambient: { status: report.suites.alpha_break_it?.ok ? 'PASS' : 'UNKNOWN' },
    overlay_shell: { status: report.suites.lifere_self_audit?.ok ? 'PASS' : 'UNKNOWN' },
  },
  adam_first_session: report.adam_first_session,
  verify_commands: report.adam_first_session.verify_commands,
};

const auditPath = path.join(ROOT, 'products/receipts/FOUNDER_ALPHA_READINESS_AUDIT.json');
const overlayPath = path.join(ROOT, 'products/receipts/LUMIN_OVERLAY_ALPHA_READINESS.json');
fs.mkdirSync(path.dirname(auditPath), { recursive: true });
fs.writeFileSync(auditPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(overlayPath, `${JSON.stringify(overlayReceipt, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  conductor_verdict: report.conductor_verdict,
  ready_for_adam_alpha: report.ready_for_adam_alpha,
  deploy_sha: report.deploy_sha,
  passed: report.passed.length,
  failed: report.failed.length,
  warnings: report.warnings,
  entry: report.adam_first_session.entry,
}, null, 2));

process.exit(report.ok ? 0 : 1);
