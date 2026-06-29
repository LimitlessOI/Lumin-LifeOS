#!/usr/bin/env node
/**
 * SYNOPSIS: LifeOS User Auth v1 acceptance — register, login, tier gate, Lumin account identity.
 * Stub: BuilderOS implements full test per BLUEPRINT.json step UAT-007.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFEOS-USER-AUTH-V1-0001';
const RECEIPT_REL = 'products/receipts/LIFEOS_USER_AUTH_V1_ACCEPTANCE.json';
const RECEIPT = path.join(ROOT, RECEIPT_REL);
const VERDICT = path.join(ROOT, `builderos-reboot/MISSIONS/${MISSION}/OBJECTIVE_VERDICT.json`);

const report = {
  schema: 'lifeos_user_auth_v1_acceptance',
  mission_id: MISSION,
  at: new Date().toISOString(),
  passed: [],
  failed: [],
  tests_passed: [],
  tests_failed: [],
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  (ok ? report.tests_passed : report.tests_failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
  console.log(`${ok ? '✅' : '❌'} ${id}${detail ? ` — ${detail}` : ''}`);
}

step('UAT-STUB_pending_build', false, 'Blueprint not yet built — BuilderOS implements per BLUEPRINT.json steps UAT-001 through UAT-007');

const { pass } = finishBpAcceptance({
  root: ROOT,
  missionId: MISSION,
  report,
  receiptAbsPath: RECEIPT,
  receiptRelPath: RECEIPT_REL,
  verdictAbsPath: VERDICT,
  objectiveName: 'LifeOS Consumer Auth v1',
  objectiveVerdictOnPass: 'TECHNICAL_PASS',
  base: '',
  syncTestId: 'UAT-STUB_pending_build',
  buildRecord: {
    build_method: 'system-build',
    note: 'LifeOS user auth blueprint — stub receipt. BuilderOS implements per blueprint steps.',
  },
  verdictExtra: {
    acceptance_command: 'npm run lifeos:user-auth:v1-acceptance',
    machine_alpha_command: 'npm run lifeos:machine-alpha-walkthrough',
  },
});

process.exit(pass ? 0 : 1);
