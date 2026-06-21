#!/usr/bin/env node
/**
 * SYNOPSIS: Mechanical Tier 1 telemetry gate — fail-closed for active missions.
 * Mechanical Tier 1 telemetry gate — fail-closed for active missions.
 * Exit 0 only when MISSION_TELEMETRY_RECEIPT.json satisfies Tier 1 + nine questions.
 *
 * Usage:
 *   node verify-tier1-telemetry.mjs FACTORY-DELIBERATION-SENTRY-REGRESSION-0001
 *   node verify-tier1-telemetry.mjs --active   # all non-complete missions in queue
 *   node verify-tier1-telemetry.mjs --active --enforce  # exit 1 if any fail
 *
 * @ssot builderos-reboot/SNT_TELEMETRY_DOCTRINE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPLETE_STATUSES,
  ENFORCED_STATUSES,
  runTier1Check,
} from './tier1-telemetry-lib.mjs';
import { REPO_ROOT, loadJson } from './mission-lib.mjs';

const args = process.argv.slice(2);
const enforce = args.includes('--enforce');
const activeOnly = args.includes('--active');
const factoryScope = args.includes('--factory-scope');
const missionIds = args.filter((a) => !a.startsWith('--'));

function activeMissionIds() {
  const queue = loadJson('builderos-reboot/MISSION_QUEUE.json');
  return (queue.missions ?? [])
    .filter((m) => !COMPLETE_STATUSES.has(m.status))
    .filter((m) => ENFORCED_STATUSES.has(m.status) || m.telemetry_enforcement === true)
    .filter((m) => !factoryScope || String(m.mission_id).startsWith('FACTORY-REBOOT-'))
    .map((m) => m.mission_id);
}

const targets = activeOnly
  ? activeMissionIds()
  : missionIds.length
    ? missionIds
    : [];

if (!targets.length) {
  if (factoryScope && activeOnly) {
    console.log('PASS tier1 factory-scope — no active FACTORY-REBOOT missions require Tier 1 receipts');
    process.exit(0);
  }
  console.error('Usage: verify-tier1-telemetry.mjs <MISSION_ID> | --active [--enforce] [--factory-scope]');
  process.exit(1);
}

const results = [];
let failed = 0;

for (const missionId of targets) {
  const result = runTier1Check(missionId, { writeResult: true });
  results.push(result);
  const ok = result.verdict === 'TIER1_PASS';
  if (!ok) failed++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${missionId} — ${result.verdict_framing} (missing: ${result.missing_summary.slice(0, 5).join(', ')}${result.missing_summary.length > 5 ? '…' : ''})`,
  );
  if (result.phase_gate.loop_until_tier1) {
    console.log(`  → LOOP: stay in ${result.phase_gate.loop_target ?? 'debug'} until Tier 1 receipt complete`);
  }
}

const summary = {
  generated_at: new Date().toISOString(),
  missions_checked: targets.length,
  passed: targets.length - failed,
  failed,
  enforce,
  results: results.map((r) => ({
    mission_id: r.mission_id,
    verdict: r.verdict,
    phase_gate: r.phase_gate,
    missing: r.missing_summary,
  })),
};

const outPath = path.join(REPO_ROOT, 'builderos-reboot/TIER1_BATCH_CHECK_RESULT.json');
fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`\nTier 1 batch: ${summary.passed}/${summary.missions_checked} pass → ${outPath}`);
process.exit(enforce && failed ? 1 : 0);
