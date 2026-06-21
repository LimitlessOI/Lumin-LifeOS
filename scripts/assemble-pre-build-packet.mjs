#!/usr/bin/env node
/**
 * Assemble PRE_BUILD_VALIDATION_PACKET from post-ARC receipts.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadJson(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

const missionRel = process.argv[2];
const simArg = process.argv.indexOf('--sim-report');
const simRel = simArg >= 0 ? process.argv[simArg + 1] : null;

if (!missionRel) {
  console.error('Usage: node scripts/assemble-pre-build-packet.mjs <mission_folder_rel> [--sim-report <sim.json>]');
  process.exit(1);
}

const missionFolder = path.join(REPO_ROOT, missionRel);
const missionId = path.basename(missionFolder);
const simPath = simRel
  ? path.join(REPO_ROOT, simRel)
  : path.join(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json');
const sim = loadJson(simPath);
const blocking = sim?.summary?.blocking_gaps ?? sim?.blocking_gaps ?? 0;

const packet = {
  schema: 'pre_build_validation_packet_v1',
  mission_id: missionId,
  assembled_at: new Date().toISOString(),
  assembled_by: 'assemble-pre-build-packet.mjs',
  builder_simulation_ref: path.relative(REPO_ROOT, simPath).replace(/\\/g, '/'),
  arc_twin_ref: path.relative(REPO_ROOT, path.join(missionFolder, 'receipts/ARC_TWIN_SIMULATION_RECEIPT.json')).replace(/\\/g, '/'),
  snt_translation_ref: path.relative(REPO_ROOT, path.join(missionFolder, 'receipts/SNT_TRANSLATION_ATTACK_REPORT.json')).replace(/\\/g, '/'),
  blocking_gaps: blocking,
  builder_clearance: blocking === 0 && fs.existsSync(simPath) ? 'yes' : 'no',
};

writeJson(path.join(missionFolder, 'PRE_BUILD_VALIDATION_PACKET.json'), packet);
console.log(JSON.stringify({ ok: packet.builder_clearance === 'yes', mission_id: missionId, blocking_gaps: blocking }, null, 2));
process.exit(packet.builder_clearance === 'yes' ? 0 : 1);
