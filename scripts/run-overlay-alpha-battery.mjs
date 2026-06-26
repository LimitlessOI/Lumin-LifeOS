#!/usr/bin/env node
/**
 * SYNOPSIS: Agent alpha battery — Lumin + LifeRE overlay readiness (local + optional live).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live = process.argv.includes('--live');

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

const steps = [
  ['builder:preflight', 'npm', ['run', 'builder:preflight']],
  ['lifere-agent-alpha', 'node', ['scripts/run-lifere-agent-alpha.mjs']],
  ['agent-alpha-gate', 'npm', ['run', 'lifeos:agent-alpha-gate:verify']],
  ['supervise-static', 'npm', ['run', 'lifeos:supervise:static']],
];

if (live) {
  steps.push(['alpha-break-it', 'npm', ['run', 'lifeos:alpha:break-it']]);
}

if (live) {
  steps.push(['lumin-chair-parity', 'npm', ['run', 'lifeos:lumin-chair:parity']]);
  steps.push(['alpha-connection', 'node', ['scripts/alpha-test-lumin-connection.mjs']]);
  steps.push(['conversation-live', 'npm', ['run', 'lifeos:lumin:conversation:verify:live']]);
}

const report = {
  schema: 'overlay_alpha_battery_v1',
  at: new Date().toISOString(),
  mode: live ? 'live' : 'local',
  passed: [],
  failed: [],
  ok: true,
};

for (const [id, cmd, args] of steps) {
  const env = live && id === 'lifere-agent-alpha'
    ? { ...process.env, LIFERE_AGENT_ALPHA_LIVE: '1' }
    : process.env;
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', env });
  const ok = r.status === 0;
  if (ok) report.passed.push(id);
  else {
    report.failed.push(id);
    report.ok = false;
    report[`fail_${id}`] = (r.stderr || r.stdout || '').slice(0, 400);
  }
}

const out = path.join(ROOT, 'products/receipts/OVERLAY_ALPHA_BATTERY.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
