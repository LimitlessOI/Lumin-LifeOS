#!/usr/bin/env node
/**
 * SYNOPSIS: Full harness gap audit — tool wiring + optional operational verify.
 * Usage: node scripts/builderos-harness-gap-audit.mjs [--operational] [--strict]
 * @ssot builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditHarnessToolWiring,
  loadHarnessToolsManifest,
  writeHarnessAuditReport,
} from '../services/builderos-harness-toolkit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const operational = process.argv.includes('--operational');
const strict = process.argv.includes('--strict');

const manifest = loadHarnessToolsManifest();
const audit = auditHarnessToolWiring({ manifest });

const report = {
  ...audit,
  operational_verify: null,
  manifest_updated_at: manifest.updated_at,
};

if (operational) {
  const r = spawnSync('npm', ['run', 'builderos:working-definition:verify:operational'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, BUILDEROS_WORKING_OPERATIONAL: '1' },
  });
  let json = null;
  try {
    json = JSON.parse(String(r.stdout || '').trim().split('\n').pop());
  } catch {
    json = { parse_error: true, stdout_tail: String(r.stdout || '').slice(-2000) };
  }
  report.operational_verify = {
    exit_code: r.status,
    ok: r.status === 0,
    operational_overall: json?.operational_overall ?? null,
    operational_all_ten: json?.operational_all_ten ?? null,
  };
}

const outPath = writeHarnessAuditReport(report);
console.log(JSON.stringify(report, null, 2));
console.error(`\nWrote ${outPath}`);

const operationalFail = operational && report.operational_verify?.ok !== true;
const strictPartialFail = strict && audit.summary.required_partial > 0;
if (!audit.ok || operationalFail || strictPartialFail) {
  for (const tool of audit.tools.filter((t) => t.actual_status !== 'wired')) {
    console.error(`GAP ${tool.pillar}/${tool.id}: ${tool.actual_status} — ${tool.issues.join('; ') || tool.note || ''}`);
  }
  for (const gap of audit.platform_gaps || []) {
    console.error(`PLATFORM ${gap.rank}: ${gap.id} — ${gap.summary}`);
  }
  process.exit(1);
}

process.exit(0);
