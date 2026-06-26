#!/usr/bin/env node
/**
 * SYNOPSIS: Governance covenant live loop — prove covenants hold on production, receipt failures.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const report = {
  schema: 'governance_covenant_live_v1',
  at: new Date().toISOString(),
  ok: false,
  covenant_loop: 'probe → receipt → fix → redeploy → reprobe',
  passed: [],
  failed: [],
  suites: {},
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function runNpm(script) {
  const r = spawnSync('npm', ['run', script], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  return { ok: r.status === 0, exit: r.status, tail: (r.stderr || r.stdout || '').slice(-500) };
}

for (const [id, script] of [
  ['truth_lockdown', 'lifeos:truth-lockdown:verify'],
  ['wisdom_audit', 'lifeos:wisdom:audit'],
  ['chair_parity', 'lifeos:lumin-chair-parity:live'],
  ['direct_execution_point_b', 'lifeos:direct-execution:point-b:live'],
]) {
  const r = runNpm(script);
  report.suites[id] = { ok: r.ok, exit: r.exit };
  step(`SUITE-${id}`, r.ok, r.tail);
}

report.ok = report.failed.length === 0;
report.governance_effective = report.ok;

const outPath = path.join(ROOT, 'products/receipts/GOVERNANCE_COVENANT_LIVE.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  governance_effective: report.governance_effective,
  passed: report.passed.length,
  failed: report.failed.length,
  failures: report.failed,
}, null, 2));
process.exit(report.ok ? 0 : 1);
