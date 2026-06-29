#!/usr/bin/env node
/**
 * SYNOPSIS: Verifies the current Point B target mission and emits a machine-readable gate receipt.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluatePointBGate } from '../factory-staging/factory-core/arc/point-b-gate.js';
import { loadPointBTarget } from '../factory-staging/factory-core/arc/foundation/point-b-target.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message, extra = {}) {
  const payload = {
    ok: false,
    pass: false,
    status: 'POINT_B_GATE_BLOCKED',
    error: message,
    ...extra,
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const target = loadPointBTarget();
if (!target?.mission_id) {
  fail('POINT_B_TARGET.json missing target.mission_id', {
    target_path: 'builderos-reboot/POINT_B_TARGET.json',
  });
}

const missionFolder = path.join(
  ROOT,
  target.mission_folder || `builderos-reboot/MISSIONS/${target.mission_id}`,
);

if (!fs.existsSync(missionFolder)) {
  fail('Point B mission folder missing', {
    mission_id: target.mission_id,
    mission_folder: path.relative(ROOT, missionFolder),
  });
}

const blueprintPath = path.join(missionFolder, 'BLUEPRINT.json');
if (!fs.existsSync(blueprintPath)) {
  fail('Point B mission missing BLUEPRINT.json', {
    mission_id: target.mission_id,
    blueprint_path: path.relative(ROOT, blueprintPath),
  });
}

const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
const report = evaluatePointBGate(missionFolder, { blueprint });
const receiptDir = path.join(missionFolder, 'receipts');
const receiptPath = path.join(receiptDir, 'POINT_B_GATE_REPORT.json');

fs.mkdirSync(receiptDir, { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.pass,
  status: report.status,
  mission_id: report.mission_id,
  point_b_target: target.label,
  point_b_reached: report.point_b_reached,
  machine_path_complete: report.machine_path_complete,
  alpha_reached: report.alpha_reached,
  receipt_path: path.relative(ROOT, receiptPath),
  violations: report.violations,
}, null, 2));

process.exit(report.pass ? 0 : 1);
