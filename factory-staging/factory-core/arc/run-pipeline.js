/**
 * SYNOPSIS: System ARC pipeline — entry gate → simulate → receipts. No agent impersonation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../builder/run-step.js';
import { resolveMissionFolder, loadMissionJson, missionRel } from './mission-paths.js';
import { runArcEntryGate } from './entry-gate.js';
import { simulateBlueprintSteps } from './simulate-blueprint-steps.js';

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function runPreBuildAssembler(missionFolder) {
  const script = path.join(REPO_ROOT, 'scripts/assemble-pre-build-packet.mjs');
  if (!fs.existsSync(script)) return { ok: false, detail: 'assemble-pre-build-packet.mjs missing' };
  const simRel = path.join(missionRel(missionFolder), 'receipts/BUILDER_SIMULATION_REPORT.json');
  const r = spawnSync(
    process.execPath,
    [script, missionRel(missionFolder), '--sim-report', simRel],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  return { ok: r.status === 0, detail: (r.stderr || r.stdout || '').trim() };
}

/**
 * System ARC pipeline — entry gate → simulate → receipts. No agent impersonation.
 */
export function runArcPipeline(missionIdOrPath, { skipEntry = false, writeReceipts = true } = {}) {
  const missionFolder = resolveMissionFolder(missionIdOrPath);
  if (!missionFolder) {
    return { ok: false, error: 'mission_id required' };
  }

  const missionId = path.basename(missionFolder);
  const entry = skipEntry ? { ok: true, status: 'SKIPPED' } : runArcEntryGate(missionFolder);

  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  if (!blueprint) {
    return {
      ok: false,
      mission_id: missionId,
      entry,
      error: 'missing BLUEPRINT.json — run ARC translate via POST /api/v1/builderos/arc/translate',
    };
  }

  const simulation = simulateBlueprintSteps(blueprint, { missionFolder });

  const receipt = {
    schema: 'arc_run_receipt_v1',
    mission_id: missionId,
    run_at: new Date().toISOString(),
    runner: 'factory-core/arc/run-pipeline.js',
    entry_gate: entry.ok ? 'PASS' : 'FAIL',
    entry_status: entry.status,
    entry_violations: entry.violations || [],
    simulation_summary: simulation.summary,
    translate: { status: 'NOT_REQUESTED' },
    blueprint_written: false,
    system_produced: true,
  };

  let preBuild = null;
  if (writeReceipts) {
    const receiptsDir = path.join(missionFolder, 'receipts');
    writeJson(path.join(receiptsDir, 'BUILDER_SIMULATION_REPORT.json'), simulation);
    writeJson(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'), receipt);
    preBuild = runPreBuildAssembler(missionFolder);
    receipt.pre_build_assemble = preBuild.ok ? 'PASS' : 'FAIL';
    writeJson(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'), receipt);
  }

  const ok = entry.ok && simulation.summary.clear_to_build;

  return {
    ok,
    mission_id: missionId,
    entry,
    simulation,
    receipt,
    pre_build: preBuild,
    builder_clearance: simulation.summary.clear_to_build ? 'yes' : 'no',
  };
}
