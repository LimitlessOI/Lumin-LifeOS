#!/usr/bin/env node
/**
 * LifeOS Objective 1 — Conversation Commitments v1 acceptance.
 * PASS = blueprint exists + full vertical slice on production API + UI + receipt.
 * @ssot builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/FOUNDER_PACKET.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-CONVERSATION-COMMITMENTS-C2-0001';
const BLUEPRINT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'BLUEPRINT.json');
const UI = path.join(ROOT, 'public/overlay/lifeos-commitments-v1.html');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'CONVERSATION_COMMITMENTS_V1_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/CONVERSATION_COMMITMENTS_V1_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const SAMPLE = `Adam: I'll call the contractor tomorrow about the roof leak.
Sarah: Can you send the invoice by Friday?
Adam: Yes, I'll send the invoice by end of week.`;

const report = {
  schema: 'conversation_commitments_v1_acceptance_v1',
  mission_id: MISSION,
  started_at: new Date().toISOString(),
  base,
  tests_passed: [],
  tests_failed: [],
  steps: [],
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
  (ok ? report.tests_passed : report.tests_failed).push(name);
}

async function api(method, urlPath, body) {
  const r = await fetch(`${base}${urlPath}`, {
    method,
    headers: { 'content-type': 'application/json', ...(key ? { 'x-command-key': key } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
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
    objectiveName: 'LifeOS Objective 1 — Conversation Commitments v1',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    base,
    buildRecord: {
      canonical_url: '/overlay/lifeos-commitments-v1.html',
      build_method: 'system-build',
      note: 'Founder 48h voluntary reuse bar is human-only; do not re-run unless regression',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:conversation-commitments:v1-acceptance',
      canonical_url: '/overlay/lifeos-commitments-v1.html',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

if (!base || !key) {
  step('env', false, { base: Boolean(base), key: Boolean(key) });
  finish();
}

step('blueprint_exists', fs.existsSync(BLUEPRINT), BLUEPRINT);
step('ui_exists', fs.existsSync(UI), UI);
if (fs.existsSync(UI)) {
  const html = fs.readFileSync(UI, 'utf8');
  step('ui_has_paste_extract', html.includes('Extract commitments') && html.includes('conversation'), 'lifeos-commitments-v1.html');
}

const empty = await api('POST', '/api/v1/lifeos/commitments/extract', { user: 'adam', text: '   ' });
step('snt_empty_text_400', empty.status === 400, { http: empty.status });

const tag = `acc-${Date.now()}`;
const convo = SAMPLE.replace('contractor', `contractor ${tag}`);
const ext = await api('POST', '/api/v1/lifeos/commitments/extract', { user: 'adam', text: convo });
const items = ext.json?.extracted || [];
const hasEvidence = items.length >= 2 && items.every((i) => i.source_quote && i.confidence != null && i.extraction_method);
step('extract_with_evidence', ext.status === 200 && hasEvidence, { http: ext.status, count: items.length, hasEvidence });

const save = await api('POST', '/api/v1/lifeos/commitments/from-conversation', { user: 'adam', text: convo, save: true });
const saved = save.json?.logged || [];
step('save_from_conversation', save.status === 200 && saved.length >= 2, { http: save.status, count: saved.length });

const list = await api('GET', '/api/v1/lifeos/commitments?user=adam&limit=200');
const ids = (list.json?.commitments || []).map((c) => c.id);
const found = saved.length >= 2 && saved.every((c) => ids.includes(c.id));
step('list_contains_saved', list.status === 200 && found, { http: list.status, saved: saved.length, found });

if (saved[0]?.id) {
  const keep = await api('POST', `/api/v1/lifeos/commitments/${saved[0].id}/keep`, {});
  step('mark_done', keep.status === 200 && keep.json?.commitment?.status === 'kept', { id: saved[0].id });
}
if (saved[1]?.id) {
  const brk = await api('POST', `/api/v1/lifeos/commitments/${saved[1].id}/break`, { reason: 'acceptance' });
  step('mark_broken', brk.status === 200 && brk.json?.commitment?.status === 'broken', { id: saved[1].id });
}

try {
  const ready = await fetch(`${base}/api/v1/lifeos/builder/ready`, { headers: { 'x-command-key': key } }).then((r) => r.json());
  report.railway_sha = ready?.codegen?.deploy_commit_sha || '';
} catch { /* */ }

finish();
