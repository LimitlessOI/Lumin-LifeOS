#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE OS v1 acceptance — Point B proof for LifeRE Alpha.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
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
  schema: 'lifere_os_v1_acceptance_v2',
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

function fileContains(filePath, pattern) {
  if (!fs.existsSync(filePath)) return false;
  return pattern.test(fs.readFileSync(filePath, 'utf8'));
}

const servicePath = path.join(ROOT, 'services/lifere-os-v1.js');
step('LRE-T01_service_file', fs.existsSync(servicePath), servicePath);
step('LRE-T01b_top3_export', fileContains(servicePath, /top3Priorities/), 'top3Priorities export');

const routesPath = path.join(ROOT, 'routes/lifere-os-routes.js');
step('LRE-T02_routes_file', fs.existsSync(routesPath), routesPath);
step('LRE-T02b_top3_route', fileContains(routesPath, /\/top-3/), 'GET/POST /top-3');

const liferePage = path.join(ROOT, 'public/overlay/lifeos-lifere.html');
step('LRE-T04_lifere_page', fs.existsSync(liferePage), liferePage);
step('LRE-T04b_daily_marker', fileContains(liferePage, /data-lifere="daily-command-center"/), 'daily-command-center marker');
step('LRE-T04c_top3_marker', fileContains(liferePage, /data-lifere="top-3-priorities"/), 'top-3-priorities marker');
step('LRE-T04d_debrief_marker', fileContains(liferePage, /data-lifere="nightly-debrief"/), 'nightly-debrief marker');

const appPath = path.join(ROOT, 'public/overlay/lifeos-app.html');
step('LRE-T05_app_lifere_path', fs.existsSync(appPath), appPath);
step('LRE-T05b_lifere_nav', fileContains(appPath, /lifeos-lifere\.html/) && fileContains(appPath, /data-lifere-nav/), 'LifeRE nav in app shell');
step('LRE-T05c_point_b_strip', fileContains(appPath, /data-point-b-strip/) && fileContains(appPath, /point-b\/status/), 'Point B strip + status poll');

const blueprintPath = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'BLUEPRINT.json');
step('LRE-T06_blueprint', fs.existsSync(blueprintPath), blueprintPath);

const navigatorPath = path.join(ROOT, 'services/point-b-navigator.js');
step('LRE-T07_navigator', fs.existsSync(navigatorPath), navigatorPath);

const bridgePath = path.join(ROOT, 'services/lifere-boldtrail-bridge.js');
step('LRE-T08_boldtrail_bridge', fs.existsSync(bridgePath), bridgePath);
step('LRE-T08b_boldtrail_status_route', fileContains(routesPath, /\/boldtrail\/status/), 'GET /boldtrail/status');
step('LRE-T08c_lifere_boldtrail_marker', fileContains(liferePage, /data-lifere="boldtrail-sync"/), 'boldtrail-sync marker');
step('LRE-T08d_followup_approve_route', fileContains(routesPath, /\/follow-up\/approve/), 'POST /follow-up/approve');

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
    note: 'Point B = LifeRE Alpha. Founder success test = lifeos-app LifeRE path + daily cycle.',
  },
  verdictExtra: {
    acceptance_command: 'npm run lifeos:lifere-os:v1-acceptance',
    founder_success_test: 'Open lifeos-app LifeRE path; daily command center + top-3 + debrief visible',
  },
  passPredicate: (r) => r.tests_failed.length === 0,
});

console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
