#!/usr/bin/env node
/**
 * LifeOS Commitment Route v2.1 acceptance.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFEOS-COMMITMENT-ROUTE-V2-0001';
const BLUEPRINT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'BLUEPRINT.json');
const RECEIPT = path.join(ROOT, 'products/receipts/COMMITMENT_ROUTE_V2_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/COMMITMENT_ROUTE_V2_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'commitment_route_v2_acceptance_v1',
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
    objectiveName: 'LifeOS Commitment Route v2.1',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base,
    syncTestId: 'LCR2-T06_bp_sync',
    buildRecord: { build_method: 'system-build' },
    verdictExtra: { acceptance_command: 'npm run lifeos:commitment-route:v2-acceptance' },
    passPredicate: (r) => r.tests_failed.length === 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

if (!base || !key) {
  step('LCR2-ENV', false, { base: Boolean(base), key: Boolean(key) });
  finish();
}

step('LCR2-T01_blueprint', fs.existsSync(BLUEPRINT), BLUEPRINT);

const health = await api('GET', '/api/v1/lifeos/commitment-route/health');
step('LCR2-T01', health.status === 200 && health.json?.service === 'commitment-route-v2', health.json);

const tag = `lcr2-${Date.now()}`;
const user = 'adam';

const captured = await api('POST', '/api/v1/lifeos/action-inbox/capture', {
  user,
  source: 'acceptance',
  text: `I promise to send the proposal by Friday ${tag}`,
  mode: 'conversation',
});
step(
  'LCR2-T02_capture',
  captured.status === 200 && captured.json?.item?.classification === 'commitment',
  captured.json?.item,
);

const itemId = captured.json?.item?.id;
if (itemId) {
  const approved = await api('POST', `/api/v1/lifeos/action-inbox/items/${itemId}/approve`, { user });
  step('LCR2-T03_approve', approved.status === 200 && approved.json?.item?.status === 'approved', approved.json?.item?.status);

  const routed = await api('POST', `/api/v1/lifeos/commitment-route/from-inbox/${itemId}`, { user });
  step(
    'LCR2-T04_route',
    routed.status === 200 && routed.json?.commitment_id,
    { commitment_id: routed.json?.commitment_id, status: routed.json?.commitment?.status },
  );

  if (routed.json?.commitment_id) {
    const itemAfter = await api('GET', `/api/v1/lifeos/action-inbox/items/${itemId}?user=${user}`);
    step('LCR2-T05_done', itemAfter.status === 200 && itemAfter.json?.item?.status === 'done', itemAfter.json?.item?.status);
  }
}

finish();
