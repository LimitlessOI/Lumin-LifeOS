#!/usr/bin/env node
/**
 * SYNOPSIS: Provider API → tool → LifeOS system proof event — production regression proof.
 * Provider API → tool → LifeOS system proof event — production regression proof.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/PROVIDER_TOOL_ACTION_PROOF.json');
const ENDPOINT = '/api/v1/lifeos/provider-tool-proof';
const VERIFY_PREFIX = '/api/v1/lifeos/system-proof-event/';

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'provider_tool_action_proof_v1',
  started_at: new Date().toISOString(),
  production_base: base || null,
  tests_passed: [],
  tests_failed: [],
  blockers: [],
  provider_results: {},
};

function step(id, ok, detail = null) {
  (ok ? report.tests_passed : report.tests_failed).push(id);
  if (detail != null) report[`detail_${id}`] = detail;
  if (!ok) report.blockers.push({ test: id, detail });
}

function parseBuildNum(buildStr) {
  const m = String(buildStr || '').match(/v(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function assertToolProofResult(id, body, expectedProvider) {
  const checks = {
    ok: body?.ok === true,
    provider: body?.provider === expectedProvider,
    model: Boolean(body?.model),
    timestamp: Boolean(body?.timestamp),
    provider_request_id: Boolean(body?.provider_request_id),
    tool_called: body?.tool_called === true,
    tool_name: body?.tool_name === 'create_lifeos_system_proof_event',
    proof_event_id: Number.isFinite(Number(body?.proof_event_id)),
    verification_endpoint: Boolean(body?.verification_endpoint),
    no_council: body?.council_used !== true,
    test_tag: body?.test === 'provider_tool_action_proof',
  };
  const pass = Object.values(checks).every(Boolean);
  return { pass, checks, body };
}

async function verifyProofRecord(proofEventId) {
  const res = await fetch(`${base}${VERIFY_PREFIX}${proofEventId}`, {
    headers: { 'x-command-key': key },
  });
  const body = await res.json().catch(() => ({}));
  return {
    http_status: res.status,
    ok: res.ok && body.ok === true && body.verified === true,
    body,
  };
}

async function main() {
  if (!base || !key) {
    report.blockers.push({ test: 'ENV', detail: 'PUBLIC_BASE_URL and COMMAND_CENTER_KEY required' });
    fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
    fs.writeFileSync(RECEIPT, JSON.stringify(report, null, 2));
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const hdrs = { 'content-type': 'application/json', 'x-command-key': key };

  const health = await fetch(`${base}/api/v1/lifeos/voice-rail/health`, { headers: hdrs });
  const healthJson = await health.json().catch(() => ({}));
  step('HEALTH', health.ok && healthJson.provider_tool_action_proof === true, healthJson);
  report.deploy_build = healthJson.build || null;
  report.deploy_sha = healthJson.deploy_commit_sha || process.env.RAILWAY_GIT_COMMIT_SHA || null;

  const cases = [
    { id: 'PTA-T01', text: 'Ask GPT to create a LifeOS proof event.', provider: 'openai' },
    { id: 'PTA-T02', text: 'Ask Claude to create a LifeOS proof event.', provider: 'anthropic' },
    { id: 'PTA-T03', text: 'Ask Gemini to create a LifeOS proof event.', provider: 'google' },
  ];

  for (const c of cases) {
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ text: c.text, user: 'adam' }),
    });
    const body = await res.json().catch(() => ({}));
    const evalResult = assertToolProofResult(c.id, body, c.provider);
    let verify = null;
    if (evalResult.pass && body.proof_event_id) {
      verify = await verifyProofRecord(body.proof_event_id);
    }
    const fullPass = evalResult.pass && verify?.ok === true;
    step(c.id, fullPass, { http_status: res.status, checks: evalResult.checks, verify, body_summary: {
      provider: body.provider,
      model: body.model,
      provider_request_id: body.provider_request_id,
      tool_called: body.tool_called,
      proof_event_id: body.proof_event_id,
      verification_endpoint: body.verification_endpoint,
    } });
    report.provider_results[c.provider] = {
      ok: fullPass,
      http_status: res.status,
      model: body.model,
      provider_request_id: body.provider_request_id,
      tool_called: body.tool_called,
      proof_event_id: body.proof_event_id,
      verification_endpoint: body.verification_endpoint,
      verify,
    };
  }

  report.finished_at = new Date().toISOString();
  report.pass = report.tests_failed.length === 0;
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  report.blockers.push({ test: 'FATAL', detail: err.message });
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, JSON.stringify(report, null, 2));
  console.error(err);
  process.exit(1);
});
