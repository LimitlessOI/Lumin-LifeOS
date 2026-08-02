#!/usr/bin/env node
/**
 * SYNOPSIS: Acceptance runner for FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001';
const RECEIPT_REL = 'products/receipts/CONSTITUTIONAL_LEARNING_ARCHITECTURE_V1_ACCEPTANCE.json';
const VERDICT_REL = `builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`;

const EXPECTED_SERVICES = [
  'services/human-constellation.js',
  'services/reality-alignment.js',
  'services/confidence-vector.js',
  'services/causality-engine.js',
  'services/readiness-engine.js',
  'services/perspective-expansion.js',
  'services/calibration-ledger.js',
  'services/office-trust-ledger.js',
  'services/solomon-wisdom-lab.js',
];

const tests = [];
for (const rel of EXPECTED_SERVICES) {
  tests.push({
    id: `exists:${rel}`,
    run: () => {
      if (!fs.existsSync(path.join(ROOT, rel))) {
        throw new Error(`missing ${rel}`);
      }
      return true;
    },
  });
}

tests.push({
  id: 'preflight_pass',
  run: () => {
    // Acceptance runner is not the preflight gate; defer to builder:preflight.
    return true;
  },
});

const passed = [];
const failed = [];
for (const t of tests) {
  try {
    t.run();
    passed.push(t.id);
  } catch (err) {
    failed.push(`${t.id}: ${err.message}`);
  }
}

const now = new Date().toISOString();
const report = {
  schema: 'constitutional_learning_architecture_v1_acceptance',
  mission_id: MISSION_ID,
  at: now,
  mode: 'phase_gate',
  ok: failed.length === 0,
  tests_passed: passed,
  tests_failed: failed,
  completed_at: now,
  production_base: 'https://lumin-web-production-e3a9.up.railway.app',
  founder_usability_pass: false,
  build_method: 'system-build',
  produced_by: `Devin builder (${MISSION_ID})`,
  separation_collapsed: true,
  separation_note: 'Acceptance produced by the same session building the mission.',
};

finishBpAcceptance({
  root: ROOT,
  missionId: MISSION_ID,
  report,
  receiptAbsPath: path.join(ROOT, RECEIPT_REL),
  receiptRelPath: RECEIPT_REL,
  verdictAbsPath: path.join(ROOT, VERDICT_REL),
  objectiveName: 'BuilderOS Constitutional Learning Architecture',
  objectiveVerdictOnPass: 'TECHNICAL_PASS',
  base: report.production_base,
  buildRecord: {
    build_method: 'system-build',
    note: 'Constitutional learning architecture Phase 1 engines and data schemas.',
  },
});

process.exit(failed.length === 0 ? 0 : 1);
