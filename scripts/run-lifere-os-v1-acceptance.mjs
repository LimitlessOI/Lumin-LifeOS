#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE OS v1 acceptance — Point B proof for LifeRE Alpha.
 * LifeRE OS v1 acceptance — Point B proof for LifeRE Alpha.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFERE-OS-V1-0001';
const RECEIPT = path.join(ROOT, 'products/receipts/LIFERE_OS_V1_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/LIFERE_OS_V1_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'lifere_os_v1_acceptance_v1',
  mission_id: MISSION,
  started_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  founder_usability_pass: false,
  point_b: 'LifeRE Alpha — acceptance must PASS before Point B claim',
};

function step(id, ok, detail = '') {
  (ok ? report.tests_passed : report.tests_failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

const servicePath = path.join(ROOT, 'services/lifere-os-v1.js');
step('LRE-T01_service_file', fs.existsSync(servicePath), servicePath);

const routesPath = path.join(ROOT, 'routes/lifere-os-routes.js');
const altRoutes = path.join(ROOT, 'routes/lifeos-os-routes.js');
step('LRE-T02_routes_file', fs.existsSync(routesPath) || fs.existsSync(altRoutes), 'lifere-os-routes or lifeos-os-routes');

const { pass } = finishBpAcceptance({
  root: ROOT,
  missionId: MISSION,
  report,
  receiptAbsPath: RECEIPT,
  receiptRelPath: RECEIPT_REL,
  verdictAbsPath: VERDICT,
  objectiveName: 'LifeRE OS v1 (LifeRE Alpha)',
  objectiveVerdictOnPass: 'TECHNICAL_PASS',
  base: '',
  syncTestId: 'LRE-T03_bp_sync',
  buildRecord: {
    build_method: 'system-build',
    note: 'Point B = LifeRE Alpha. Active product arc — never-stop until founder success test PASS.',
  },
  verdictExtra: {
    acceptance_command: 'npm run lifeos:lifere-os:v1-acceptance',
  },
  passPredicate: (r) => r.tests_failed.length === 0,
});

console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
