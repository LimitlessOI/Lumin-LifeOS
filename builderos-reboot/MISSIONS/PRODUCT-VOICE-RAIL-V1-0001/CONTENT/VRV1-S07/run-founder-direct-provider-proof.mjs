#!/usr/bin/env node
/**
 * SYNOPSIS: Founder Direct Provider production regression proof.
 * Founder Direct Provider production regression proof.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * HISTORY_SNAPSHOT — not runtime authority; mission-era snapshot.
 * @ssot builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/FOUNDER_DIRECT_PROVIDER_PROOF_SPEC.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/FOUNDER_DIRECT_PROVIDER_PROOF.json');
const MIN_BUILD = 31;
const ENDPOINT = '/api/v1/lifeos/voice-rail/founder-direct-provider';

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'founder_direct_provider_proof_v1',
  blueprint_step: 'VRV1-S07',
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

function assertLiveProviderResult(id, body, expectedProvider) {
  const checks = {
    ok: body?.ok === true,
    provider: body?.provider === expectedProvider,
    model: Boolean(body?.model),
    timestamp: Boolean(body?.timestamp),
    raw_response: body?.raw_response && typeof body.raw_response === 'object',
    test_tag: body?.test === 'founder_direct_provider',
    no_council: body?.council_used !== true,
    text: Boolean(String(body?.text || '').trim()),
  };
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  step(id, failed.length === 0, failed.length ? { failed, body_summary: { ok: body?.ok, provider: body?.provider, error: body?.error } } : {
    provider: body.provider,
    model: body.model,
    request_id: body.request_id,
    timestamp: body.timestamp,
  });
  return failed.length === 0 ? body : null;
}

async function api(method, urlPath, body) {
  const r = await fetch(`${base}${urlPath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(key ? { 'x-command-key': key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: r.status, json };
}

function finish(exitCode) {
  report.finished_at = new Date().toISOString();
  report.pass = report.tests_failed.length === 0 && report.blockers.length === 0;
  report.verdict = report.pass ? 'PASS' : 'FAIL';
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReceipt: ${RECEIPT}`);
  console.log(report.pass ? '\n✅ FOUNDER DIRECT PROVIDER PROOF PASS' : `\n❌ FOUNDER DIRECT PROVIDER PROOF FAIL (${report.tests_failed.length} tests)`);
  process.exit(typeof exitCode === 'number' ? exitCode : report.pass ? 0 : 1);
}

if (!base || !key) {
  report.blockers.push({
    test: 'ENV',
    detail: 'PUBLIC_BASE_URL and COMMAND_CENTER_KEY required for production proof',
  });
  finish(1);
}

const health = await api('GET', '/api/v1/lifeos/voice-rail/health');
const buildNum = parseBuildNum(health.json?.build);
step('FDP-T01', health.status === 200 && health.json?.founder_direct_provider === true && buildNum >= MIN_BUILD, {
  status: health.status,
  build: health.json?.build,
  founder_direct_provider: health.json?.founder_direct_provider,
});

const cases = [
  { id: 'FDP-T02', utterance: 'Talk to GPT: what model are you and what is 2+2?', provider: 'openai' },
  { id: 'FDP-T03', utterance: 'Talk to Claude: what model are you and what is 2+2?', provider: 'anthropic' },
  { id: 'FDP-T04', utterance: 'Talk to Gemini: what model are you and what is 2+2?', provider: 'google' },
];

for (const c of cases) {
  const res = await api('POST', ENDPOINT, { text: c.utterance });
  if (res.status === 503 && res.json?.error?.startsWith?.('missing_api_key')) {
    step(c.id, false, { blocker: res.json.error, http: res.status });
    report.provider_results[c.provider] = res.json;
    continue;
  }
  const body = res.json;
  report.provider_results[c.provider] = {
    http_status: res.status,
    ok: body?.ok,
    model: body?.model,
    request_id: body?.request_id,
  };
  const live = assertLiveProviderResult(c.id, body, c.provider);
  if (!live) continue;
}

finish();
