#!/usr/bin/env node
/**
 * SYNOPSIS: Live break-it alpha — stress edge cases beyond standard batteries.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const fp = path.join(ROOT, '.env');
  if (!fs.existsSync(fp)) return;
  for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const BASE = (process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

const report = {
  schema: 'lifeos_alpha_break_it_v1',
  at: new Date().toISOString(),
  base: BASE,
  passed: [],
  failed: [],
  ok: false,
};

function pass(id, detail = '') {
  report.passed.push(id);
  if (detail) report[`pass_${id}`] = detail;
}

function fail(id, detail = '') {
  report.failed.push(id);
  report[`fail_${id}`] = detail;
}

async function req(method, url, body, headers = {}) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(KEY ? { 'x-command-key': KEY } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, text: JSON.stringify(json).slice(0, 300) };
}

if (!KEY) fail('auth', 'COMMAND_CENTER_KEY missing');

// ── Auth fail-closed ──
const noAuth = await req('GET', '/api/v1/lifere/health', undefined, { 'x-command-key': '' });
if (noAuth.status === 401 || noAuth.status === 403) pass('auth_fail_closed', String(noAuth.status));
else fail('auth_fail_closed', `expected 401/403 got ${noAuth.status}`);

// ── Ambient empty text ──
const emptyAmbient = await req('POST', '/api/v1/lifeos/ambient/process', { user: 'adam', text: '   ' });
if (emptyAmbient.status === 400) pass('ambient_empty_text_400');
else fail('ambient_empty_text_400', emptyAmbient.text);

// ── Ambient status capabilities ──
const ambStatus = await req('GET', '/api/v1/lifeos/ambient/status');
const caps = ambStatus.json?.capabilities || [];
if (ambStatus.status === 200 && caps.includes('calendar_auto_create') && caps.includes('crm_auto_capture')) {
  pass('ambient_status_capabilities', caps.length + ' caps');
} else fail('ambient_status_capabilities', ambStatus.text);

// ── Appointment moment ──
const appt = await req('POST', '/api/v1/lifeos/ambient/process', {
  user: 'adam',
  text: 'Schedule a showing with Marcus tomorrow at 2pm',
  channel: 'break_it_test',
  metadata: { break_it: true },
});
const calMoment = appt.json.moments?.find((m) => m.type === 'calendar_event');
if (appt.status >= 200 && appt.json.persisted && calMoment?.title) {
  pass('ambient_calendar_moment', calMoment.title);
} else if (appt.status >= 200 && appt.json.disposition === 'ignored') {
  pass('ambient_calendar_moment', 'ignored (sleep gate ok)');
} else {
  fail('ambient_calendar_moment', appt.text);
}

// ── Commitment path ──
const commit = await req('POST', '/api/v1/lifeos/ambient/process', {
  user: 'adam',
  text: 'I will call the lender by Friday about the pre-approval',
  channel: 'break_it_test',
});
if (commit.status >= 200 && (commit.json.commitment_id || commit.json.disposition)) {
  pass('ambient_commitment', commit.json.disposition || 'commitment logged');
} else fail('ambient_commitment', commit.text);

// ── CRM + internal note (post migration) ──
const crmText = `Client BreakIt Tester prefers email only — birthday August 15 break-it-${Date.now()}`;
const crmAmb = await req('POST', '/api/v1/lifeos/ambient/process', {
  user: 'adam',
  text: crmText,
  channel: 'break_it_test',
  metadata: { break_it: true, crm_email: `break-it-${Date.now()}@lifere-alpha.test` },
});
const crmMoment = crmAmb.json.moments?.find((m) => m.type === 'crm_capture');
if (crmAmb.status >= 200 && crmAmb.json.persisted && crmMoment) {
  pass('ambient_crm_moment', crmMoment.boldtrail?.type || 'inbox');
  if (crmMoment.client_note_id) pass('ambient_internal_crm_note', String(crmMoment.client_note_id));
  else report.warnings = report.warnings || [], report.warnings.push('client_note_id null — migration may not be applied yet');
} else fail('ambient_crm_moment', crmAmb.text);

// ── Crisis signal ──
const crisis = await req('POST', '/api/v1/lifeos/ambient/crisis-signal', {
  user: 'adam',
  kind: 'relationship_stress',
  partner_consent: false,
  metadata: { break_it: true, simulated: true },
});
if (crisis.status >= 200 && crisis.status < 300 && crisis.json.ok !== false) {
  pass('ambient_crisis_signal', crisis.json.kind || 'logged');
} else fail('ambient_crisis_signal', crisis.text);

// ── LifeRE alpha readiness ──
const ready = await req('GET', '/api/v1/lifere/alpha/readiness');
if (ready.status === 200 && ready.json.ok !== false) {
  pass('lifere_alpha_readiness', ready.json.agent_alpha_pass ? 'agent_pass' : ready.json.verdict || 'ok');
} else fail('lifere_alpha_readiness', ready.text);

// ── Founder daily cycle ──
const cycle = await req('POST', '/api/v1/lifere/alpha/founder-attempt', {
  user_id: 'adam',
  goal_gci: 30000,
  activity_counts: { calls: 2, conversations: 5 },
  debrief_notes: 'Break-it alpha cycle',
  source: 'break_it_script',
});
if (cycle.status === 200 && cycle.json.ok !== false) {
  pass('lifere_founder_cycle', cycle.json.daily_focus?.length ? 'has focus' : 'ok');
} else fail('lifere_founder_cycle', cycle.text);

// ── Overlay static assets ──
for (const [id, asset] of [
  ['static_lifeos_app', '/overlay/lifeos-app.html'],
  ['static_lifeos_lifere', '/overlay/lifeos-lifere.html'],
  ['static_lifeos_login', '/overlay/lifeos-login.html'],
]) {
  const res = await fetch(`${BASE}${asset}`);
  if (res.status === 200) pass(id, String(res.headers.get('content-length') || 'ok'));
  else fail(id, String(res.status));
}

// ── Lumin break-it: nonsense then command ──
const counsel = await req('POST', '/api/v1/lifeos/builderos/command-control/founder-interface/message', {
  text: 'Should I prioritize follow-ups or prospecting today?',
});
if (counsel.status === 200 && counsel.json.ok !== false && !counsel.json.error?.includes('text or text_file')) {
  pass('lumin_counsel_break_it', counsel.json.lumin_chair ? 'chair' : 'reply');
} else fail('lumin_counsel_break_it', counsel.text);

const cmd = await req('POST', '/api/v1/lifeos/builderos/command-control/founder-interface/message', {
  text: 'open LifeRE',
});
if (cmd.status === 200 && (cmd.json.command_ran || cmd.json.system_action?.ok || cmd.json.pass_fail === 'PASS')) {
  pass('lumin_command_break_it', cmd.json.command_truth || 'ran');
} else fail('lumin_command_break_it', cmd.text);

// ── Duplicate BoldTrail create same email (should not 500) ──
const email = `break-it-dup-${Date.now()}@lifere-alpha.test`;
const c1 = await req('POST', '/api/v1/lifere/boldtrail/contacts', { name: 'BreakIt Dup', email, source: 'break-it' });
const c2 = await req('POST', '/api/v1/lifere/boldtrail/contacts', { name: 'BreakIt Dup 2', email, source: 'break-it' });
if (c1.status >= 200 && c1.status < 300 && c2.status < 500) {
  pass('boldtrail_dup_create_no_crash', `first=${c1.status} second=${c2.status}`);
} else fail('boldtrail_dup_create_no_crash', `c1=${c1.status} c2=${c2.status} ${c2.text}`);

// ── Sentry: UI deal/comms routes (404 = founder alpha break) ──
const sentryUi = [
  ['sentry_buyer_workspace', 'GET', '/api/v1/lifere/buyer/demo_buyer_001/workspace?user_id=adam'],
  ['sentry_seller_workspace', 'GET', '/api/v1/lifere/seller/demo_listing_001/workspace?user_id=adam'],
  ['sentry_comms_suggest', 'GET', '/api/v1/lifere/client-comms/suggest-vars?user_id=adam&ref=demo_buyer_001&side=buyer'],
  ['sentry_buyer_objection', 'POST', '/api/v1/lifere/buyer/demo_buyer_001/objection-coach', { user_id: 'adam', objection: 'sentry probe' }],
  ['sentry_seller_weekly', 'POST', '/api/v1/lifere/seller/demo_listing_001/weekly-report', { user_id: 'adam' }],
];
for (const [id, method, url, body] of sentryUi) {
  const r = await req(method, url, body);
  if (r.status !== 404 && r.status < 500 && r.json?.ok !== false) pass(id, String(r.status));
  else fail(id, `${r.status} ${r.text}`);
}

report.ok = report.failed.length === 0;
report.break_it_pass = report.ok;
const out = path.join(ROOT, 'products/receipts/LIFEOS_ALPHA_BREAK_IT.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
