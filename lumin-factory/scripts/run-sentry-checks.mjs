#!/usr/bin/env node
/**
 * SYNOPSIS: Mechanical SENTRY checklist — outputs SENTRY_CHECK_RESULT.json Mechanical SENTRY checklist — outputs SENTRY_CHECK_RESULT.json */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function exists(rel) {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

function loadJson(rel) {
  const p = path.join(REPO_ROOT, rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function runOk(args) {
  return spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8' }).status === 0;
}

const checks = [
  { id: 'SM-001', name: 'Mission packs through 0029 exist', pass: exists('builderos-reboot/MISSIONS/FACTORY-REBOOT-0029/BLUEPRINT.json') },
  { id: 'SM-002', name: 'Acceptance tests pass', pass: runOk(['builderos-reboot/scripts/run-all-mission-acceptance.mjs']) },
  { id: 'SM-003', name: 'Execute-step live', pass: runOk(['builderos-reboot/scripts/factory-execute-step-integration.mjs']) },
  { id: 'SM-004', name: 'Council quarantine (no live calls)', pass: exists('factory-staging/factory-core/canon/services/council-adapter.js') },
  { id: 'SM-005', name: 'Determinism mechanical receipt', pass: loadJson('builderos-reboot/DETERMINISM_RECEIPT.json')?.pass === true },
  { id: 'SM-006', name: 'Greenfield 3x receipt', pass: loadJson('builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json')?.pass === true },
  { id: 'SM-007', name: 'Duplication receipt', pass: loadJson('builderos-reboot/DUPLICATION_RECEIPT.json')?.pass === true },
  { id: 'SM-008', name: 'Cutover bundle verify', pass: runOk(['builderos-reboot/scripts/cutover-verify.mjs']) },
  { id: 'SM-009', name: 'Lumin-Factory repo init path', pass: exists('lumin-factory/REPO_INIT_MANIFEST.json') },
  { id: 'SM-010', name: 'Factory CI umbrella', pass: runOk(['builderos-reboot/scripts/factory-ci.mjs']) },
  { id: 'SM-011', name: 'No FULLY_MACHINE_READY overclaim', pass: loadJson('builderos-reboot/PROJECT_CERTIFICATION.json')?.levels?.FULLY_MACHINE_READY === false },
  { id: 'SM-012', name: 'SENTRY audit report exists', pass: exists('builderos-reboot/SENTRY_AUDIT_REPORT.md') },
  { id: 'SM-013', name: 'Full loop proof receipt', pass: loadJson('builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json')?.pass === true },
  { id: 'SM-014', name: 'TSOS hot path integration', pass: runOk(['builderos-reboot/scripts/factory-tsos-integration.mjs']) },
  { id: 'SM-015', name: 'Deliberation v27 mission SENTRY pass', pass: loadJson('builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/SENTRY_CHECK_RESULT.json')?.verdict === 'SENTRY_MISSION_PASS' },
  { id: 'SM-016', name: 'Deliberation v27 aspect SENTRY loop pass', pass: loadJson('builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/SESSION_SENTRY_LOOP_RESULT.json')?.verdict === 'SENTRY_SESSION_PASS' },
];

const pass = checks.every((c) => c.pass);
const result = {
  generated_at: new Date().toISOString(),
  verdict: pass ? 'SENTRY_MECHANICAL_PASS' : 'SENTRY_MECHANICAL_FAIL',
  qualitative_verdict: pass ? 'BOOTSTRAP_AND_STAGING_READY' : 'NOT_READY',
  checks,
  human_review_required: 'See SENTRY_AUDIT_REPORT.md for qualitative findings',
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/SENTRY_CHECK_RESULT.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
