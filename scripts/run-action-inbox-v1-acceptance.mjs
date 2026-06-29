#!/usr/bin/env node
/**
 * SYNOPSIS: LifeOS Action Inbox v1 acceptance — production proof.
 * LifeOS Action Inbox v1 acceptance — production proof.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-ACTION-INBOX-V1-0001';
const BLUEPRINT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'BLUEPRINT.json');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'ACTION_INBOX_V1_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/ACTION_INBOX_V1_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'action_inbox_v1_acceptance_v1',
  mission_id: MISSION,
  started_at: new Date().toISOString(),
  production_base: base,
  tests_passed: [],
  tests_failed: [],
  founder_usability_pass: false,
};

function step(id, ok, detail = '') {
  (ok ? report.tests_passed : report.tests_failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

async function api(method, urlPath, body) {
  const r = await fetch(`${base}${urlPath}`, {
    method,
    headers: { 'content-type': 'application/json', ...(key ? { 'x-command-key': key } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 400) }; }
  return { status: r.status, json };
}

function finish() {
  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'LifeOS Action Inbox v1',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base,
    syncTestId: 'AIV1-T10_bp_sync',
    buildRecord: {
      build_method: 'GAP-FILL',
      note: 'Action Inbox v1 acceptance. BP build request boundary enforced.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:action-inbox:v1-acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

if (!base || !key) {
  step('AIV1-ENV', false, { base: Boolean(base), key: Boolean(key) });
  finish();
}

step('AIV1-T01_blueprint', fs.existsSync(BLUEPRINT), BLUEPRINT);

const health = await api('GET', '/api/v1/lifeos/action-inbox/health');
step(
  'AIV1-T01',
  health.status === 200
    && health.json?.service === 'action-inbox-v1'
    && Array.isArray(health.json?.classification_types)
    && typeof health.json?.status_machine === 'object',
  { http: health.status, service: health.json?.service },
);

const tag = `ai1-${Date.now()}`;
const user = 'adam';

const normalCapture = await api('POST', '/api/v1/lifeos/action-inbox/capture', {
  user,
  source: 'api',
  text: `Hello action inbox acceptance ${tag}`,
});
step(
  'AIV1-T02',
  normalCapture.status === 200
    && normalCapture.json?.item?.id
    && normalCapture.json?.item?.classification,
  { http: normalCapture.status, classification: normalCapture.json?.item?.classification },
);

const taskCapture = await api('POST', '/api/v1/lifeos/action-inbox/capture', {
  user,
  source: 'api',
  text: `Send the quarterly report to the team by end of day`,
  mode: 'command',
});
const taskItem = taskCapture.json?.item;
step(
  'AIV1-T03',
  taskCapture.status === 200
    && taskItem?.id
    && taskItem?.status === 'staged',
  { http: taskCapture.status, status: taskItem?.status },
);

const bpCapture = await api('POST', '/api/v1/lifeos/action-inbox/capture', {
  user,
  source: 'voice_rail',
  text: `Please build and deploy the new memory service for the builder mission`,
});
const bpItem = bpCapture.json?.item;
const bpIsBpClass = bpItem?.classification === 'bp_build_request';
const bpIsStaged = bpItem?.status === 'staged';

if (bpItem?.id && bpIsBpClass && bpIsStaged) {
  const bpRouteAttempt = await api('POST', `/api/v1/lifeos/action-inbox/items/${bpItem.id}/route`, {
    department: 'CDR',
  });
  step(
    'AIV1-T04',
    bpRouteAttempt.status === 400
      && bpItem?.classification === 'bp_build_request'
      && bpItem?.status === 'staged',
    { route_blocked: bpRouteAttempt.status === 400, classification: bpItem?.classification, status: bpItem?.status },
  );
} else {
  step('AIV1-T04', false, { bpClass: bpItem?.classification, status: bpItem?.status });
}

const commitCapture = await api('POST', '/api/v1/lifeos/action-inbox/capture', {
  user,
  source: 'voice_rail',
  text: `I will send the invoice by Friday for ${tag}-commit`,
});
const commitItem = commitCapture.json?.item;
step(
  'AIV1-T05',
  commitCapture.status === 200
    && commitItem?.classification === 'commitment',
  { http: commitCapture.status, classification: commitItem?.classification },
);

const countBefore = await api('GET', `/api/v1/lifeos/action-inbox/items?user=${user}&status=staged`);
const beforeCount = countBefore.json?.count || 0;

const privateNeedle = `${tag}-private-no-save-secret`;
const privateCapture = await api('POST', '/api/v1/lifeos/action-inbox/capture', {
  user,
  source: 'api',
  text: `Private off-record note: ${privateNeedle}`,
  mode: 'private',
});
const privateItem = privateCapture.json?.item;
const isPrivateLocal = privateCapture.status === 200 && privateItem?.private === true && privateItem?.persisted === false && !privateItem?.id;

const countAfter = await api('GET', `/api/v1/lifeos/action-inbox/items?user=${user}&status=staged`);
const afterCount = countAfter.json?.count || 0;

step(
  'AIV1-T06',
  isPrivateLocal && afterCount === beforeCount,
  { private: isPrivateLocal, count_before: beforeCount, count_after: afterCount },
);

let approvedItem = null;
if (taskItem?.id) {
  const approveRes = await api('POST', `/api/v1/lifeos/action-inbox/items/${taskItem.id}/approve`);
  approvedItem = approveRes.json?.item;
  step(
    'AIV1-T07',
    approveRes.status === 200 && approvedItem?.status === 'approved',
    { http: approveRes.status, status: approvedItem?.status },
  );
} else {
  step('AIV1-T07', false, 'no task item to approve');
}

let routedItem = null;
let routeReceipt = null;
if (approvedItem?.id) {
  const routeRes = await api('POST', `/api/v1/lifeos/action-inbox/items/${approvedItem.id}/route`, {
    department: 'commitments',
  });
  routedItem = routeRes.json?.item;
  routeReceipt = routeRes.json?.receipt;
  step(
    'AIV1-T08',
    routeRes.status === 200
      && routedItem?.status === 'routed'
      && routeReceipt?.id,
    { http: routeRes.status, status: routedItem?.status, receipt: routeReceipt?.id },
  );
} else {
  step('AIV1-T08', false, 'no approved item to route');
}

const listStagedRes = await api('GET', `/api/v1/lifeos/action-inbox/items?user=${user}&status=staged`);
const stagedItems = listStagedRes.json?.items || [];
const stagedContainsCommit = stagedItems.some((i) => i.classification === 'commitment' || String(i.raw_text).includes(`${tag}-commit`));
step(
  'AIV1-T09',
  listStagedRes.status === 200 && stagedContainsCommit,
  { http: listStagedRes.status, count: stagedItems.length, contains_commit: stagedContainsCommit },
);

const receiptsRes = await api('GET', `/api/v1/lifeos/action-inbox/receipts?user=${user}`);
const receipts = receiptsRes.json?.receipts || [];
const hasRoutedReceipt = receipts.some((r) => r.outcome === 'routed');
step(
  'AIV1-T10',
  receiptsRes.status === 200 && hasRoutedReceipt,
  { http: receiptsRes.status, count: receipts.length, has_routed: hasRoutedReceipt },
);

finish();
