#!/usr/bin/env node
/**
 * SYNOPSIS: Mechanical SENTRY BP audit — system template (v27 pattern).
 * Mechanical SENTRY BP audit — system template (v27 pattern).
 * Installed by recovery protocol. Env: OBJECTIVE_ID
 * @ssot builderos-reboot/SNT_LOOP_ESCALATION_DOCTRINE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { blueprintFreezeCheck } from '../../../../factory-staging/factory-core/sentry/blueprint-freeze-check.js';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const OBJECTIVE_ID =
  process.env.OBJECTIVE_ID || 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
const DIR = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', OBJECTIVE_ID);

function add(checks, id, name, pass, detail = '') {
  checks.push({ id, name, pass, detail });
}

const checks = [];

for (const f of ['FOUNDER_PACKET.json', 'BLUEPRINT.json', 'ACCEPTANCE_TESTS.json', 'REGRESSION_PROBE_CATALOG.json']) {
  add(checks, `BP-${f}`, `${f} exists`, fs.existsSync(path.join(DIR, f)));
}

const bp = JSON.parse(fs.readFileSync(path.join(DIR, 'BLUEPRINT.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(DIR, 'REGRESSION_PROBE_CATALOG.json'), 'utf8'));
const acceptance = JSON.parse(fs.readFileSync(path.join(DIR, 'ACCEPTANCE_TESTS.json'), 'utf8'));

const freeze = blueprintFreezeCheck(bp);
add(checks, 'P0-FREEZE', 'Blueprint freeze check', freeze.pass, freeze.pass ? 'ok' : JSON.stringify(freeze.violations || []).slice(0, 200));

const probeIds = (catalog.probes || []).map((p) => p.id);
const covered = new Set(
  (acceptance.tests || acceptance).filter((t) => t.probe_id).map((t) => t.probe_id),
);
const missingProbes = probeIds.filter((id) => !covered.has(id));
add(
  checks,
  'P0-1',
  'Every catalog probe in acceptance tests',
  missingProbes.length === 0,
  missingProbes.length ? `missing: ${missingProbes.join(',')}` : 'all covered',
);

const forbiddenTargets = [
  'services/deliberation-governance-service.js',
  'config/deliberation-governance.js',
];
const badStep = (bp.steps || []).find((s) =>
  forbiddenTargets.some((t) => String(s.target_file || '').includes(t)),
);
add(checks, 'P0-2', 'No validator edits in blueprint', !badStep, badStep?.target_file || 'ok');

const requiredFields = ['step_id', 'action_type', 'target_file', 'sandbox_boundary', 'authority_owner', 'on_block'];
const incomplete = (bp.steps || []).filter((s) => requiredFields.some((f) => !s[f]));
add(
  checks,
  'P0-3',
  'Blueprint steps have required fields',
  incomplete.length === 0,
  incomplete.length ? incomplete.map((s) => s.step_id).join(',') : 'ok',
);

const cmds = bp.exact_commands || [];
add(
  checks,
  'P0-4',
  'Exact commands include regression npm script',
  cmds.some((c) => c.includes('lifeos:deliberation:regression')),
  cmds.join('; ').slice(0, 120),
);

add(
  checks,
  'P0-5',
  'Cleanup verify-railway referenced before confirm',
  cmds.some((c) => c.includes('--verify-railway')) || JSON.stringify(bp).includes('--verify-railway'),
  'verify-railway in blueprint/commands',
);

add(checks, 'P0-6', 'No founder decision steps', !(bp.steps || []).some((s) => /founder.*decision/i.test(JSON.stringify(s))), 'ok');

const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(import.meta.url)], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
});
add(checks, 'P1-SYNTAX', 'Audit runner syntax valid', syntax.status === 0);

const blockers = checks.filter((c) => !c.pass);
const pass = blockers.length === 0;
const verdict = pass ? 'BP_AUDIT_PASS' : 'BP_AUDIT_FAIL';

const result = {
  generated_at: new Date().toISOString(),
  objective_id: OBJECTIVE_ID,
  audit_type: 'SENTRY_BP_AUDIT',
  verdict,
  checks,
  blockers: blockers.map((b) => b.id),
  generated_by: 'mechanical_template_v27_recovery',
};

fs.writeFileSync(path.join(DIR, 'SENTRY_CHECK_RESULT.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
