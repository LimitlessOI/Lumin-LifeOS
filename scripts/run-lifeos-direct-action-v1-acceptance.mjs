#!/usr/bin/env node
/**
 * SYNOPSIS: LifeOS direct action v1 acceptance.
 * LifeOS direct action v1 acceptance.
 * Founder UI path -> direct action endpoint -> provider proof -> DB readback.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/LIFEOS_DIRECT_ACTION_V1_ACCEPTANCE.json');
const BASE = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.API_KEY || '';
const DIRECT_PATH = '/api/v1/lifeos/direct-action';
const READBACK_PREFIX = '/api/v1/lifeos/system-proof-event/';

const report = {
  schema: 'lifeos_direct_action_v1_acceptance',
  started_at: new Date().toISOString(),
  production_base: BASE || null,
  verdict: 'FAIL',
  checks: {},
  proof_record_id: null,
  readback_result: null,
  blocker: null,
  evidence: {},
};

function saveAndExit(code) {
  report.finished_at = new Date().toISOString();
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, JSON.stringify(report, null, 2));
  if (code === 0) {
    console.log(JSON.stringify({ verdict: report.verdict, proof_record_id: report.proof_record_id }, null, 2));
  } else {
    console.error(JSON.stringify({ verdict: report.verdict, blocker: report.blocker }, null, 2));
  }
  process.exit(code);
}

function fail(blocker, extra = {}) {
  report.verdict = 'FAIL';
  report.blocker = blocker;
  Object.assign(report, extra);
  saveAndExit(1);
}

function readCurrentLine(pattern, file) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
  const idx = content.findIndex((line) => line.includes(pattern));
  return idx >= 0 ? { file, line: idx + 1, text: content[idx].trim() } : null;
}

function readPreviousLine(pattern, file) {
  try {
    const prev = execSync(`git show HEAD~1:${file}`, { cwd: ROOT, encoding: 'utf8' }).split('\n');
    const idx = prev.findIndex((line) => line.includes(pattern));
    return idx >= 0 ? { file, line: idx + 1, text: prev[idx].trim() } : null;
  } catch {
    return null;
  }
}

function containsForbidden(value) {
  const text = String(value || '');
  return (
    /\bAdam\b/.test(text)
    || /\bCouncil Chair\b/i.test(text)
    || /\bBuilderOS\b/.test(text)
    || /\btarget file\b/i.test(text)
    || /\bstag(ed|ing)\b/i.test(text)
    || /\bmission pack/i.test(text)
  );
}

async function main() {
  if (!BASE || !KEY) fail('PUBLIC_BASE_URL and COMMAND_CENTER_KEY are required');

  report.evidence.old_routing_point = readPreviousLine("const res = await api('POST', '/message', body);", 'public/overlay/lifeos-voice-rail-v1.html');
  report.evidence.new_hard_route = readCurrentLine('const directAction = await tryDirectAction(content, mode, engines);', 'public/overlay/lifeos-voice-rail-v1.html');
  report.evidence.direct_action_route = readCurrentLine("router.post('/direct-action'", 'routes/lifeos-direct-action-routes.js');
  report.evidence.provider_proof_handler = readCurrentLine('executeProviderToolProofAction(pool, {', 'services/lifeos-direct-action.js');
  report.evidence.ui_call = readCurrentLine("const res = await lifeosApi('POST', '/direct-action'", 'public/overlay/lifeos-voice-rail-v1.html');

  const headers = { 'content-type': 'application/json', 'x-command-key': KEY };
  const payload = {
    user: 'adam',
    text: 'verify GPT connection',
    current_mode: 'lifeos',
    session_id: `acceptance-${Date.now()}`,
    selected_provider: 'openai_gpt',
    selected_providers: ['openai_gpt'],
  };
  report.evidence.ui_payload = payload;

  const res = await fetch(`${BASE}${DIRECT_PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  report.checks.http_200 = res.status === 200;
  report.checks.matched = json.matched === true;
  report.checks.action_type = json.action_type === 'provider_proof';
  report.checks.executed = json.executed === true;
  report.checks.ok = json.ok === true;
  report.checks.visible_message = typeof json.visible_founder_message === 'string' && json.visible_founder_message.length > 0;
  report.checks.no_forbidden_text = !containsForbidden(json.visible_founder_message);
  report.checks.result_record = Boolean(json.result_record?.ok);
  report.checks.provider_tool_proof = Boolean(json.provider_tool_proof?.ok);
  report.evidence.direct_action_response = {
    status: res.status,
    ok: json.ok,
    matched: json.matched,
    action_type: json.action_type,
    executed: json.executed,
    visible_founder_message: json.visible_founder_message,
    proof_record_id: json.result_record?.proof_event_id || json.proof_record?.proof_event_id || null,
  };

  const proofId = json.result_record?.proof_event_id || json.proof_record?.proof_event_id || null;
  report.proof_record_id = proofId;
  if (!proofId) {
    fail(`direct action did not return a proof record id (status ${res.status})`, { response: json });
  }

  const readbackRes = await fetch(`${BASE}${READBACK_PREFIX}${encodeURIComponent(proofId)}`, {
    headers: { 'x-command-key': KEY },
  });
  const readbackJson = await readbackRes.json().catch(() => ({}));
  report.readback_result = {
    status: readbackRes.status,
    ok: readbackJson.ok,
    proof_event_id: readbackJson.proof_event_id,
    verified: readbackJson.verified,
    provider: readbackJson.metadata?.provider || null,
    model: readbackJson.metadata?.model || null,
    provider_request_id: readbackJson.metadata?.provider_request_id || null,
  };
  report.checks.readback_200 = readbackRes.status === 200;
  report.checks.readback_ok = readbackJson.ok === true;
  report.checks.readback_id = String(readbackJson.proof_event_id) === String(proofId);
  report.checks.readback_verified = readbackJson.verified === true;

  const pass = Object.values(report.checks).every(Boolean);
  if (!pass) {
    fail(`acceptance checks failed for proof_record_id=${proofId}`);
  }

  report.verdict = 'PASS';
  saveAndExit(0);
}

main().catch((err) => fail(err.message));
