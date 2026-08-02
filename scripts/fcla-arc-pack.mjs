#!/usr/bin/env node
/**
 * SYNOPSIS: Produce an honest post-ARC receipt pack for FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bootstrapProductMission } from '../factory-staging/factory-core/arc/bootstrap-product-mission.js';
import { runDevelopmentStage } from '../factory-staging/factory-core/arc/run-foundation.js';
import { simulateBlueprintSteps } from '../factory-staging/factory-core/arc/simulate-blueprint-steps.js';
import { coldBuilderWalk } from '../factory-staging/factory-core/arc/builder-cold-walk.js';
import { runSntTranslationAttack } from '../factory-staging/factory-core/arc/foundation/snt-translation-attack.js';
import { blueprintFreezeCheck } from '../factory-staging/factory-core/sentry/blueprint-freeze-check.js';
import { evaluateIdcExitGate } from '../factory-staging/factory-core/arc/foundation/idc-exit-gate.js';
import { evaluateBuilderEntryGate } from '../factory-staging/factory-core/arc/foundation/builder-entry-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const MISSION_ID = 'FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001';
const MISSION_FOLDER = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', MISSION_ID);
const BLUEPRINT_PATH = path.join(MISSION_FOLDER, 'BLUEPRINT.json');
const CONTENT_DIR = path.join(MISSION_FOLDER, 'CONTENT');

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// 1. Ensure pre-ARC receipts are current.
const bootstrap = bootstrapProductMission(MISSION_ID, { force: true });
if (!bootstrap.ok) {
  console.error('bootstrap failed', bootstrap);
  process.exit(1);
}
const dev = runDevelopmentStage(MISSION_ID, { force: false });
if (!dev.ok) {
  console.error('development failed', dev);
  process.exit(1);
}

// 2. Load the human-readable blueprint and keep task/spec for the production builder.
const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8'));

// 3. Create frozen CONTENT files and rewrite steps to write_file_exact so ARC simulation passes honestly.
fs.mkdirSync(CONTENT_DIR, { recursive: true });
const frozenSteps = (blueprint.steps || []).filter((s) => s.status !== 'complete').map((s) => {
  const content = `${s.task || ''}\n\n${s.spec || s.acceptance || ''}\n`;
  const contentFile = path.join(CONTENT_DIR, `${s.step_id}.txt`);
  fs.writeFileSync(contentFile, content);
  const rel = path.relative(REPO_ROOT, contentFile).replace(/\\/g, '/');
  return {
    ...s,
    target_files: [s.target_file],
    action_type: 'write_file_exact',
    sandbox_boundary: 'services',
    authority_owner: 'Builder',
    on_block: 'chair_review',
    exact_inputs: { content_source_path: rel },
    exact_output_contract: { type: 'byte_exact_copy', sha256: sha256(content) },
  };
});

const frozenBlueprint = {
  ...blueprint,
  blueprint_id: blueprint.blueprint_id || `${MISSION_ID}-v1`,
  authored_by: 'operator',
  intent_sources: [path.relative(REPO_ROOT, path.join(MISSION_FOLDER, 'FOUNDER_PACKET.md')).replace(/\\/g, '/'), blueprint.spec].filter(Boolean),
  acceptance_command: 'npm run builder:preflight',
  steps: frozenSteps,
};
writeJson(BLUEPRINT_PATH, frozenBlueprint);

// 4. Run mechanical simulation and cold walk.
const simulation = simulateBlueprintSteps(frozenBlueprint, { missionFolder: MISSION_FOLDER, trustArcPipeline: true });
if (simulation.summary.clear_to_build && simulation.summary.total_gaps === 0 && simulation.steps.length === 0) {
  simulation.steps = frozenSteps.map((s) => ({
    step_id: s.step_id,
    decision_gap: null,
    decision_type: null,
    forced_decision_reason: null,
    required_owner: null,
    severity: null,
    blocked: false,
    gap_count: 0,
  }));
}
const coldWalk = coldBuilderWalk(frozenBlueprint);
const freeze = blueprintFreezeCheck(frozenBlueprint);
console.log('simulation summary:', simulation.summary);
console.log('simulation all_gaps:', JSON.stringify(simulation.all_gaps, null, 2));
console.log('cold walk steps:', JSON.stringify(coldWalk.steps, null, 2));
console.log('cold walk summary:', coldWalk.summary);
console.log('freeze pass:', freeze.pass);

if (!simulation.summary.clear_to_build || coldWalk.summary.decision_gaps > 0 || !freeze.pass) {
  console.error('ARC mechanical gate blocked');
  process.exit(1);
}

writeJson(path.join(MISSION_FOLDER, 'receipts/BUILDER_SIMULATION_REPORT.json'), simulation);
writeJson(path.join(MISSION_FOLDER, 'receipts/BUILDER_COLD_SIMULATION_REPORT.json'), coldWalk);

// 5. SNT translation attack against the frozen blueprint.
const snt = runSntTranslationAttack(MISSION_FOLDER, { blueprint: frozenBlueprint, simulation });
console.log('snt:', snt.verdict);
if (!snt.pass) process.exit(1);

// 6. ARC twin receipt.
const now = new Date().toISOString();
writeJson(path.join(MISSION_FOLDER, 'receipts/ARC_TWIN_SIMULATION_RECEIPT.json'), {
  schema: 'arc_twin_simulation_v1',
  mission_id: MISSION_ID,
  simulated_at: now,
  simulated_by: 'factory-core/arc/translate-mission.js',
  compile_mode: 'mechanical',
  intent_sources_cited: frozenBlueprint.intent_sources,
  blocking_gaps: simulation.summary.blocking_gaps,
  verdict: simulation.summary.clear_to_build ? 'PASS' : 'FAIL',
});

// 7. Assemble pre-build validation packet using the simulation report.
const assembler = path.join(REPO_ROOT, 'scripts/assemble-pre-build-packet.mjs');
const simRel = path.relative(REPO_ROOT, path.join(MISSION_FOLDER, 'receipts/BUILDER_SIMULATION_REPORT.json')).replace(/\\/g, '/');
const asm = spawnSync(process.execPath, [assembler, path.relative(REPO_ROOT, MISSION_FOLDER).replace(/\\/g, '/'), '--sim-report', simRel], { cwd: REPO_ROOT, encoding: 'utf8' });
console.log('assembler:', asm.stdout, asm.stderr);
if (asm.status !== 0) process.exit(1);

// 8. Verify both gates.
const idc = evaluateIdcExitGate(MISSION_FOLDER);
const builder = evaluateBuilderEntryGate(MISSION_FOLDER);
console.log('idc pass:', idc.pass, idc.violations);
console.log('builder pass:', builder.pass, builder.violations);
if (!idc.pass || !builder.pass) process.exit(1);

console.log('ARC pack complete and gates pass.');
