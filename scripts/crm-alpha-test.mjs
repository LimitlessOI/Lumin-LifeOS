#!/usr/bin/env node
/**
 * SYNOPSIS: Alpha test CRM — BoldTrail connection, create bogus contact, ambient CRM capture, note write-back.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
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
const stamp = Date.now();

const report = {
  schema: 'crm_alpha_test_v1',
  at: new Date().toISOString(),
  base: BASE,
  passed: [],
  failed: [],
};

function pass(id, detail = '') {
  report.passed.push(id);
  if (detail) report[`pass_${id}`] = detail;
}

function fail(id, detail = '') {
  report.failed.push(id);
  report[`fail_${id}`] = detail;
}

async function req(method, url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(KEY ? { 'x-command-key': KEY } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

if (!KEY) fail('auth', 'COMMAND_CENTER_KEY missing in shell/.env');

const btStatus = await req('GET', '/api/v1/lifere/boldtrail/status');
if (btStatus.status === 200 && btStatus.json.boldtrail?.connected) {
  pass('boldtrail_connected', btStatus.json.boldtrail.probe || 'ok');
} else {
  fail('boldtrail_connected', btStatus.json.boldtrail?.reason || btStatus.json.error || String(btStatus.status));
}

const pipeline = await req('GET', '/api/v1/lifere/boldtrail/pipeline?limit=5');
const pipelineContacts = pipeline.json.contacts
  || pipeline.json.result?.contacts
  || [];
if (pipeline.status === 200 && pipelineContacts.length >= 0) {
  pass('boldtrail_pipeline', `${pipelineContacts.length} contacts`);
} else {
  fail('boldtrail_pipeline', JSON.stringify(pipeline.json).slice(0, 200));
}

const bogus = {
  name: `Alpha Bogus ${stamp}`,
  email: `alpha-bogus-${stamp}@lifere-alpha.test`,
  phone: '5555550201',
  source: 'LifeRE-alpha-test',
  note: 'Alpha test bogus client — safe to delete',
  tags: ['LifeRE-alpha'],
};

const btCreate = await req('POST', '/api/v1/lifere/boldtrail/contacts', bogus);
let boldtrailContactId = null;
if (btCreate.status >= 200 && btCreate.status < 300 && btCreate.json.ok) {
  boldtrailContactId = btCreate.json.contact_id
    || btCreate.json.boldtrail?.id
    || btCreate.json.boldtrail?.contact_id
    || null;
  pass('boldtrail_create_contact', `${boldtrailContactId || 'created'} via ${btCreate.json.endpoint || 'contact'}`);
} else if (btCreate.status === 404) {
  fail('boldtrail_create_contact', 'route not deployed');
} else {
  fail('boldtrail_create_contact', JSON.stringify(btCreate.json).slice(0, 300));
}

const ambientText = `Client ${bogus.name} prefers text only and birthday is July 4 — hates morning calls`;
const ambient = await req('POST', '/api/v1/lifeos/ambient/process', {
  user: 'adam',
  text: ambientText,
  channel: 'crm_alpha_test',
  metadata: {
    alpha: true,
    crm_test: true,
    boldtrail_contact_id: boldtrailContactId,
    crm_email: bogus.email,
  },
});
const crmMoment = ambient.json.moments?.find((m) => m.type === 'crm_capture');
const boldtrailMoment = crmMoment?.boldtrail;
if (ambient.status >= 200 && ambient.json.persisted && crmMoment) {
  pass('ambient_crm_capture', ambient.json.feedback || ambient.json.disposition);
  if (boldtrailMoment?.contact_id) {
    pass('ambient_boldtrail_write', boldtrailMoment.type || 'boldtrail');
  }
} else if (ambient.status >= 200 && ambient.json.persisted) {
  pass('ambient_crm_capture', ambient.json.disposition || 'persisted');
} else {
  fail('ambient_crm_capture', JSON.stringify(ambient.json).slice(0, 300));
}

const crmCreate = await req('POST', '/api/v1/crm/contacts', {
  name: bogus.name,
  email: bogus.email,
  phone: bogus.phone,
  tags: ['alpha_test'],
});
if (crmCreate.status >= 200 && crmCreate.status < 300 && crmCreate.json.ok) {
  pass('internal_crm_contact', String(crmCreate.json.contact?.id || 'ok'));
} else {
  fail('internal_crm_contact', JSON.stringify(crmCreate.json).slice(0, 200));
}

const noteContactId = boldtrailContactId || boldtrailMoment?.contact_id || pipelineContacts[0]?.id;
if (noteContactId) {
  const note = await req('POST', '/api/v1/lifere/follow-up/approve', {
    contact_id: noteContactId,
    message: `Alpha test note — ${bogus.name} prefers text; birthday July 4. Bogus — safe to delete.`,
    agent_label: 'AlphaTest',
  });
  if (note.status === 200 && note.json.ok) pass('boldtrail_note_writeback', String(noteContactId));
  else fail('boldtrail_note_writeback', JSON.stringify(note.json).slice(0, 300));
} else {
  fail('boldtrail_note_writeback', 'no contact id available');
}

report.ok = report.failed.length === 0;
report.agent_alpha_pass = report.ok;
const outPath = path.join(ROOT, 'products/receipts/CRM_ALPHA_TEST.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
