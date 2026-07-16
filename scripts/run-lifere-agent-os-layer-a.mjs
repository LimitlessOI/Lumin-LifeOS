#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE agent OS SENTRY Layer A — structural LIVE probes (no browser).
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
const RECEIPT = path.join(ROOT, 'products/receipts/SENTRY_LIFERE_AGENT_OS_LAYER_A.json');

async function req(method, pathname, body, headers = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-command-key': KEY,
      'x-command-center-key': KEY,
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json, text };
}

async function main() {
  const started = Date.now();
  const results = {};
  const findings = [];

  const agentId = Date.now();

  async function check(id, fn) {
    try {
      await fn();
      results[id] = { ok: true };
    } catch (e) {
      const detail = String(e?.message || e).slice(0, 400);
      results[id] = { ok: false, error: detail };
      findings.push({
        code: id,
        detail,
        solution: `Fix LifeRE agent OS surface for ${id}: ${detail}`,
      });
    }
  }

  await check('overlay_html_serves', async () => {
    const { res, text } = await req('GET', '/overlay/lifere-teleprompter.html');
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!/current-line/.test(text)) throw new Error('overlay missing current-line element');
    if (!/lifere-teleprompter/.test(text)) throw new Error('overlay missing lifere-teleprompter class');
  });

  await check('api_training_modules', async () => {
    const { res, json } = await req('GET', '/api/v1/lifere-agent-os/training/modules');
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!Array.isArray(json.modules)) throw new Error('modules not an array');
  });

  let rolePlayId;
  await check('api_training_roleplay', async () => {
    const { res, json } = await req('POST', '/api/v1/lifere-agent-os/training/roleplay', {
      agentId,
      scenario: 'buyer-consultation',
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!json.sessionId) throw new Error('missing sessionId');
    rolePlayId = json.sessionId;
  });

  await check('api_training_roleplay_response', async () => {
    const { res, json } = await req('POST', `/api/v1/lifere-agent-os/training/roleplay/${rolePlayId}/response`, {
      response: 'I want a 3 bedroom home near good schools.',
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
  });

  await check('api_appointment_process', async () => {
    const { res, json } = await req('POST', '/api/v1/lifere-agent-os/appointment/process', {
      agentId,
      transcript: 'I will send you that email and set up a search for 3 bed 2 bath in Summerlin under $500k.',
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!json.criteria?.bedrooms) throw new Error('criteria.bedrooms missing');
  });

  await check('api_appointment_pending_actions', async () => {
    const { res, json } = await req('GET', '/api/v1/lifere-agent-os/appointment/pending-actions', null, { agent_id: String(agentId) });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!Array.isArray(json.commitments)) throw new Error('commitments not an array');
  });

  await check('api_teleprompter_load', async () => {
    const { res, json } = await req('POST', '/api/v1/lifere-agent-os/teleprompter/load', {
      agentId,
      scenario: 'buyer-consultation',
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!json.state?.currentLine) throw new Error('missing currentLine');
  });

  await check('api_teleprompter_advance', async () => {
    const { res, json } = await req('POST', '/api/v1/lifere-agent-os/teleprompter/advance', {
      agentId,
      clientCue: 'next',
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!json.state?.currentLine) throw new Error('missing currentLine after advance');
  });

  await check('api_teleprompter_interrupt', async () => {
    const { res, json } = await req('POST', '/api/v1/lifere-agent-os/teleprompter/interrupt', {
      agentId,
      interruptionText: 'Let me tell you a story about my kid.',
    });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (!json.state?.offTopic) throw new Error('expected offTopic true');
    if (!json.state?.storyEndTransition) throw new Error('missing storyEndTransition');
  });

  await check('api_teleprompter_resume', async () => {
    const { res, json } = await req('POST', '/api/v1/lifere-agent-os/teleprompter/resume', { agentId });
    if (res.status !== 200 || !json?.ok) throw new Error(`HTTP ${res.status}: ${json?.error || 'fail'}`);
    if (json.state?.offTopic) throw new Error('expected offTopic false after resume');
    if (!json.state?.transition) throw new Error('missing transition after resume');
  });

  const ok = findings.length === 0;
  const report = {
    ok,
    layer: 'A',
    product: 'lifere-agent-os',
    implementation_status: ok ? 'PASS' : 'FAIL',
    at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    base: BASE,
    results,
    findings,
    raw: { results, findings },
  };

  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main();
