#!/usr/bin/env node
/**
 * SYNOPSIS: Verify single canonical Lumin connection — wiring + optional live parity.
 * Usage: node scripts/verify-lumin-connection.mjs [--live]
 * @ssot builderos-reboot/governance/LUMIN_CONNECTION_LAW.json
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditLuminConnectionWiring,
  buildLegacyLuminBlockedResponse,
  isLuminSingleConnectionEnforced,
  CANONICAL_FOUNDER_MESSAGE_PATH,
} from '../services/lumin-connection-guard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live = process.argv.includes('--live');

const wiring = auditLuminConnectionWiring();
const report = {
  schema: 'lumin_connection_verify_v1',
  generated_at: new Date().toISOString(),
  enforced: isLuminSingleConnectionEnforced(),
  canonical_path: CANONICAL_FOUNDER_MESSAGE_PATH,
  wiring,
  live_parity: null,
  ok: wiring.ok,
};

if (live) {
  const r = spawnSync('npm', ['run', 'lifeos:lumin-chair:parity'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  let parity = null;
  try {
    const lines = String(r.stdout || '').trim().split('\n');
    parity = JSON.parse(lines[lines.length - 1]);
  } catch {
    parity = { parse_error: true, exit_code: r.status };
  }
  report.live_parity = { exit_code: r.status, ok: r.status === 0, report: parity };
  report.ok = wiring.ok && r.status === 0;
}

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  for (const c of wiring.checks.filter((x) => !x.ok)) {
    console.error(`FAIL ${c.id}: ${c.detail}`);
  }
  if (report.live_parity && !report.live_parity.ok) {
    console.error('FAIL live parity — run npm run lifeos:lumin-chair:parity');
  }
  process.exit(1);
}

process.exit(0);
