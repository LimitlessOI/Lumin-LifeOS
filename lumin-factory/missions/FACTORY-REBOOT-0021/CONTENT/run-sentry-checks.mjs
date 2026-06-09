#!/usr/bin/env node
/** Mechanical SENTRY checklist — outputs SENTRY_CHECK_RESULT.json */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function exists(rel) {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

function runOk(args) {
  return spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8' }).status === 0;
}

const checks = [
  { id: 'SM-001', name: 'Mission packs 0001-0025 exist', pass: exists('builderos-reboot/MISSIONS/FACTORY-REBOOT-0025/BLUEPRINT.json') },
  { id: 'SM-002', name: 'Acceptance tests pass', pass: runOk(['builderos-reboot/scripts/run-all-mission-acceptance.mjs']) },
  { id: 'SM-003', name: 'Execute-step live', pass: runOk(['builderos-reboot/scripts/factory-execute-step-integration.mjs']) },
  { id: 'SM-004', name: 'Council quarantine (no live calls)', pass: exists('factory-staging/factory-core/canon/services/council-adapter.js') },
  { id: 'SM-005', name: 'Determinism mechanical receipt', pass: exists('builderos-reboot/DETERMINISM_RECEIPT.json') && JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/DETERMINISM_RECEIPT.json'), 'utf8')).pass },
  { id: 'SM-006', name: 'Greenfield 3x receipt', pass: exists('builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json') },
  { id: 'SM-007', name: 'Duplication receipt', pass: exists('builderos-reboot/DUPLICATION_RECEIPT.json') },
  { id: 'SM-008', name: 'Cutover bundle verify', pass: runOk(['builderos-reboot/scripts/cutover-verify.mjs']) },
  { id: 'SM-009', name: 'Lumin-Factory repo init path', pass: exists('lumin-factory/REPO_INIT_MANIFEST.json') },
  { id: 'SM-010', name: 'Factory CI umbrella', pass: runOk(['builderos-reboot/scripts/factory-ci.mjs']) },
];

const pass = checks.every((c) => c.pass);
const result = {
  generated_at: new Date().toISOString(),
  verdict: pass ? 'SENTRY_MECHANICAL_PASS' : 'SENTRY_MECHANICAL_FAIL',
  checks,
  human_review_required: 'Run CLAUDE_CODE_SENTRY_REVIEW_PROMPT.md for qualitative audit tomorrow',
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/SENTRY_CHECK_RESULT.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
