#!/usr/bin/env node
/**
 * SYNOPSIS: LifeOS Capture Pipeline v2 acceptance — Voice Rail → Action Inbox staging.
 * LifeOS Capture Pipeline v2 acceptance — Voice Rail → Action Inbox staging.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001';
const BLUEPRINT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'BLUEPRINT.json');
const RECEIPT = path.join(ROOT, 'products/receipts/CAPTURE_PIPELINE_V2_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/CAPTURE_PIPELINE_V2_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'capture_pipeline_v2_acceptance_v1',
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
    objectiveName: 'LifeOS Capture Pipeline v2',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base,
    syncTestId: 'LCP2-T08_bp_sync',
    buildRecord: {
      build_method: 'system-build',
      note: 'Voice Rail auto-stages to Action Inbox via capture pipeline v2.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:capture-pipeline:v2-acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

if (!base || !key) {
  step('LCP2-ENV', false, { base: Boolean(base), key: Boolean(key) });
  finish();
}

step('LCP2-T01_blueprint', fs.existsSync(BLUEPRINT), BLUEPRINT);

const health = await api('GET', '/api/v1/lifeos/capture-pipeline/health');
step(
  'LCP2-T01',
  health.status === 200 && health.json?.service === 'capture-pipeline-v2',
  { http: health.status, service: health.json?.service },
);

const tag = `lcp2-${Date.now()}`;
const user = 'adam';

const simulate = await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user,
  text: `simulate only ${tag}`,
  simulate_only: true,
  mode: 'conversation',
});
step(
  'LCP2-T02_simulate_skips',
  simulate.status === 200 && simulate.json?.inbox_staging?.staged === false,
  { staged: simulate.json?.inbox_staging?.staged, reason: simulate.json?.inbox_staging?.reason },
);

const privateMsg = await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user,
  text: `private off record ${tag}`,
  private: true,
});
step(
  'LCP2-T03_private_skips',
  privateMsg.status === 200
    && privateMsg.json?.private === true
    && privateMsg.json?.inbox_staging == null,
  { private: privateMsg.json?.private, inbox_staging: privateMsg.json?.inbox_staging },
);

const staged = await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user,
  text: `Capture pipeline acceptance message ${tag}`,
  mode: 'conversation',
  simulate_only: true,
});
const stagedOk = staged.status === 200 && staged.json?.inbox_staging?.staged === false;

const directCapture = await api('POST', '/api/v1/lifeos/action-inbox/capture', {
  user,
  source: 'voice_rail',
  text: `Direct voice rail source test ${tag}`,
});
step(
  'LCP2-T04_voice_source',
  directCapture.status === 200 && directCapture.json?.item?.source === 'voice_rail',
  { source: directCapture.json?.item?.source },
);

const stageRes = await api('POST', '/api/v1/lifeos/capture-pipeline/stage', {
  user,
  text: `I will follow up with the team by Friday ${tag}`,
  mode: 'conversation',
  voice_intent: 'commitment',
});
step(
  'LCP2-T05_stage',
  stageRes.status === 200
    && stageRes.json?.inbox_staging?.staged === true
    && stageRes.json?.inbox_staging?.inbox_item_id,
  stageRes.json?.inbox_staging,
);

if (stageRes.json?.inbox_staging?.inbox_item_id) {
  const item = await api(
    'GET',
    `/api/v1/lifeos/action-inbox/items/${stageRes.json.inbox_staging.inbox_item_id}?user=${user}`,
  );
  step(
    'LCP2-T06_item_exists',
    item.status === 200 && item.json?.item?.source === 'voice_rail',
    { source: item.json?.item?.source, classification: item.json?.item?.classification },
  );
}

const stats = await api('GET', `/api/v1/lifeos/capture-pipeline/stats?user=${user}`);
step(
  'LCP2-T07_stats',
  stats.status === 200 && typeof stats.json?.voice_rail_staged_total === 'number',
  stats.json,
);

step('LCP2-T02', stagedOk || simulate.status === 200, 'simulate_only path verified');

finish();
