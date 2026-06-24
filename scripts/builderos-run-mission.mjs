#!/usr/bin/env node
/**
 * SYNOPSIS: Run all MECHANICAL blueprint steps through canonical executor.
 * Usage: node scripts/builderos-run-mission.mjs MISSION_ID [--from STEP] [--dry-run] [--skip-gate]
 * @ssot services/builderos-canonical-executor.js
 */
import 'dotenv/config';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  executeCanonicalBlueprintStep,
  loadMissionBlueprint,
} from '../services/builderos-canonical-executor.js';
import { recordCompoundImprovement } from '../services/builderos-compound-improvement.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipGate = args.includes('--skip-gate');
const fromIdx = args.indexOf('--from');
const fromStep = fromIdx >= 0 ? args[fromIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && i !== fromIdx + 1);
const missionId = positional[0];

if (!missionId) {
  console.error('Usage: node scripts/builderos-run-mission.mjs <MISSION_ID> [--from STEP] [--dry-run] [--skip-gate]');
  process.exit(1);
}

if (!skipGate && !dryRun) {
  const gate = spawnSync('npm', ['run', 'builderos:pre-build-gate', '--', '--allow-stale'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (gate.status !== 0) {
    console.error(gate.stdout || gate.stderr);
    process.exit(gate.status || 1);
  }
}

const blueprint = loadMissionBlueprint(missionId);
let steps = [...(blueprint.steps || [])].sort((a, b) => String(a.step_id).localeCompare(String(b.step_id)));
if (fromStep) {
  const idx = steps.findIndex((s) => s.step_id === fromStep);
  if (idx < 0) {
    console.error(`Step ${fromStep} not found`);
    process.exit(1);
  }
  steps = steps.slice(idx);
}

const results = [];
let allOk = true;

for (const step of steps) {
  const tier = step.execution_tier || blueprint.execution_tier || 'MECHANICAL';
  if (tier !== 'MECHANICAL') {
    results.push({
      step_id: step.step_id,
      skipped: true,
      reason: `execution_tier=${tier} — use builderos-reboot/scripts/execute-mission.mjs for full ARC stack`,
    });
    continue;
  }

  const outcome = await executeCanonicalBlueprintStep({
    missionId,
    stepId: step.step_id,
    dryRun,
    maxRepairAttempts: 2,
  });
  results.push({ step_id: step.step_id, ...outcome });
  if (!outcome.ok) {
    allOk = false;
    recordCompoundImprovement({
      source: 'canonical_mission_run',
      mission_id: missionId,
      step_id: step.step_id,
      target_file: step.target_file,
      blocker: outcome.blocker || outcome.error,
      builderResult: outcome.dispatch?.json,
      httpStatus: outcome.dispatch?.httpStatus,
      success: false,
    });
    break;
  }
  if (outcome.committed) {
    recordCompoundImprovement({
      source: 'canonical_mission_run',
      mission_id: missionId,
      step_id: step.step_id,
      target_file: step.target_file,
      success: true,
      classification: { playbook: 'MISSION_STEP_OK', repairable: false, severity: 'P3' },
    });
  }
}

const acceptance = String(blueprint.acceptance_command || '').trim();
let acceptanceResult = null;
if (allOk && acceptance && !dryRun) {
  const cmd = acceptance.replace(/^npm run /, '');
  const r = spawnSync('npm', ['run', cmd], { cwd: ROOT, encoding: 'utf8', shell: false });
  acceptanceResult = { command: acceptance, exit_code: r.status, ok: r.status === 0 };
  if (r.status !== 0) allOk = false;
}

const report = {
  schema: 'builderos_canonical_mission_run_v1',
  generated_at: new Date().toISOString(),
  mission_id: missionId,
  dry_run: dryRun,
  steps: results,
  acceptance: acceptanceResult,
  ok: allOk,
};

const receiptPath = path.join(
  ROOT,
  'builderos-reboot/MISSIONS',
  missionId,
  'receipts',
  'CANONICAL_RUN.json',
);
if (!dryRun) {
  try {
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, `${JSON.stringify(report, null, 2)}\n`);
    report.receipt_path = path.relative(ROOT, receiptPath);
  } catch {
    /* non-fatal */
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(allOk ? 0 : 1);
