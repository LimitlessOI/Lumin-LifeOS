#!/usr/bin/env node
/**
 * SYNOPSIS: Live alpha — Lumin founder-interface chat vs terminal command parity.
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

const BASE = (process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

const report = {
  schema: 'lumin_alpha_connection_v1',
  at: new Date().toISOString(),
  base: BASE || null,
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

if (!BASE) fail('base_url', 'PUBLIC_BASE_URL or BASE_URL required');
if (!KEY) fail('auth', 'COMMAND_CENTER_KEY required');

async function founderMessage(text) {
  const res = await fetch(`${BASE}/api/v1/lifeos/builderos/command-control/founder-interface/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-command-key': KEY,
    },
    body: JSON.stringify({ text, source_mode: 'alpha_connection_test' }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

if (BASE && KEY) {
  const oil = await founderMessage('What oil does my car need?');
  const routedChair = oil.status === 200
    && oil.json.ok !== false
    && (oil.json.lumin_chair || oil.json.human_summary || oil.json.reply || oil.json.response);
  if (routedChair) pass('chat_counsel', oil.json.lumin_chair ? 'lumin_chair' : 'reply');
  else fail('chat_counsel', JSON.stringify(oil.json).slice(0, 200));

  const open = await founderMessage('open LifeRE');
  const ran = open.status === 200
    && open.json.ok !== false
    && (open.json.command_ran === true || open.json.system_action?.ok || open.json.pass_fail === 'PASS');
  if (ran) pass('chat_system_command', open.json.system_action?.action || open.json.command_truth || 'command_ran');
  else fail('chat_system_command', JSON.stringify(open.json).slice(0, 200));
}

report.ok = report.failed.length === 0 && report.passed.length >= 2;
const out = path.join(ROOT, 'products/receipts/LUMIN_ALPHA_CONNECTION_TEST.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
