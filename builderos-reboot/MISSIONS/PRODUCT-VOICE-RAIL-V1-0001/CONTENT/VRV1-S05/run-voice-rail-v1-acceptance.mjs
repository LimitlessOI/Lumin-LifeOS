#!/usr/bin/env node
/**
 * LifeOS Voice Rail v1 acceptance — production proof.
 * @ssot builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/ACCEPTANCE_SPEC.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-VOICE-RAIL-V1-0001';
const BLUEPRINT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'BLUEPRINT.json');
const UI = path.join(ROOT, 'public/overlay/lifeos-voice-rail-v1.html');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'VOICE_RAIL_V1_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/VOICE_RAIL_V1_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');
const CANONICAL_PATH = '/overlay/lifeos-voice-rail-v1.html';

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'voice_rail_v1_acceptance_v1',
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
    objectiveName: 'LifeOS Voice Rail v1',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base,
    syncTestId: 'VR1-T19_bp_sync',
    buildRecord: {
      canonical_url: CANONICAL_PATH,
      public_alias: '/voice-rail',
      build_method: 'GAP-FILL',
      intent_drift:
        'asked builder-first; Conductor hand-built after Unauthorized — Adam finish directive 2026-06-11',
      note: 'Production acceptance PASS. Founder 48h usability bar is human-only.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:voice-rail:v1-acceptance',
      canonical_url: CANONICAL_PATH,
      public_alias: '/voice-rail',
    },
    passPredicate: (r) => r.tests_failed.length === 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

if (!base || !key) {
  step('VR1-ENV', false, { base: Boolean(base), key: Boolean(key) });
  finish();
}

step('VR1-T01_blueprint', fs.existsSync(BLUEPRINT), BLUEPRINT);
step('VR1-T01_ui_file', fs.existsSync(UI), UI);

const page = await fetch(`${base}${CANONICAL_PATH}`, { headers: key ? { 'x-command-key': key } : {} });
const html = await page.text();
step('VR1-T01', page.status === 200 && html.includes('LifeOS Voice Rail'), { http: page.status });

const hasModes = ['conversation', 'command', 'brainstorm', 'private'].every((m) => html.includes(`value="${m}"`));
const hasControls = html.includes('btn-replay') && html.includes('speech-rate') && html.includes('interim-transcript');
step('VR1-T02', page.status === 200 && html.includes('viewport') && hasControls, 'responsive shell markers');
step('VR1-T03', hasModes, 'four modes in HTML');
step('VR1-T07', html.includes('interim-transcript') && html.includes('lifeos-voice-chat') && html.includes('Type a message'), 'TTS module + type-first composer (browser STT removed v1)');
step('VR1-T08', html.includes('btn-pause') && html.includes('btn-cancel') && html.includes('btn-send') && html.includes('data-testid="mic-btn"') && html.includes('mode-toggle'), 'mic icon + send; mode toggles; no auto-send');
step('VR1-T14', html.includes('btn-replay') && html.includes('speech-rate'), 'playback controls');
step('VR1-T15', html.includes('speak-replies') || html.includes('speakText'), 'TTS path in UI');
step('VR1-T17', html.includes('meeting') && html.includes('option value'), 'tag example');

const tag = `vr1-${Date.now()}`;
let sessionId = null;

const typed = await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user: 'adam',
  mode: 'conversation',
  text: `Hello Voice Rail acceptance ${tag}`,
});
sessionId = typed.json?.session_id;
step('VR1-T04', typed.status === 200 && typed.json?.assistant_message?.content, { http: typed.status });

const reload = await api('GET', `/api/v1/lifeos/voice-rail/session/${sessionId}/messages?user=adam`);
const persisted = (reload.json?.messages || []).some((m) => String(m.content).includes(tag));
step('VR1-T05', reload.status === 200 && persisted, { count: reload.json?.messages?.length });

const sim = await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user: 'adam',
  session_id: sessionId,
  mode: 'conversation',
  text: `Simulated STT transcript ${tag}-sim`,
});
step('VR1-T06', sim.status === 200 && sim.json?.persisted === true, { http: sim.status });

const fixtures = [
  ['VR1-T09', 'Please run the deploy script now', 'command', 'command'],
  ['VR1-T10', "I promise I will send the invoice by Friday", 'commitment', 'conversation'],
  ['VR1-T11', 'What if we explored three ideas for revenue', 'brainstorm', 'brainstorm'],
  ['VR1-T11b', 'The routing policy is wrong and the system should not use mission queue', 'governance_correction', 'conversation'],
  ['VR1-T11c', 'I am so frustrated and need to vent', 'emotional', 'conversation'],
];

for (const [testId, text, expected, mode] of fixtures) {
  const c = await api('POST', '/api/v1/lifeos/voice-rail/classify', { text, mode });
  const intent = c.json?.intent;
  const ok = intent === expected || (testId === 'VR1-T11c' && (intent === 'emotional' || intent === 'venting'));
  step(testId, c.status === 200 && ok, { intent, expected });
}

const commitMsg = await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user: 'adam',
  mode: 'conversation',
  text: `I will call the contractor tomorrow about ${tag}-commit`,
});
const extract = commitMsg.json?.commitment_extract;
step('VR1-T12', commitMsg.status === 200 && extract && Array.isArray(extract.extracted), { count: extract?.count });

const cmd = await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user: 'adam',
  mode: 'command',
  text: `Please build the voice rail fix ${tag}-cmd`,
});
const staged = cmd.json?.staged_command;
step('VR1-T13', cmd.status === 200 && staged?.status === 'staged' && staged?.executed === false, staged);

const stagedList = await api('GET', '/api/v1/lifeos/voice-rail/staged-commands?user=adam');
const visible = (stagedList.json?.staged_commands || []).some((s) => String(s.utterance).includes(`${tag}-cmd`));
step('VR1-T13_visible', stagedList.status === 200 && visible, 'staged visible via API');

const privNeedle = `${tag}-private-secret`;
await api('POST', '/api/v1/lifeos/voice-rail/message', {
  user: 'adam',
  mode: 'private',
  text: privNeedle,
  private: true,
});
const leak = await api('POST', '/api/v1/lifeos/voice-rail/private-leak-check', { user: 'adam', needle: privNeedle });
step('VR1-T16', leak.status === 200 && leak.json?.leaked === false, leak.json?.checks);

const health = await api('GET', '/api/v1/lifeos/voice-rail/health');
step('VR1-T18', health.status === 200 && health.json?.service === 'voice-rail-v1', health.json);
step(
  'VR1-T20_execution_truth',
  health.status === 200 && health.json?.execution_truth?.background_work === false,
  health.json?.execution_truth,
);

step('VR1-T18_receipt', report.tests_failed.length === 0, 'all automated tests');

finish();
