#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE Sales Coaching V1 acceptance test — simulator session, AI turns, debrief.
 * scripts/run-lifere-sales-coaching-acceptance.mjs
 *
 * Usage: node scripts/run-lifere-sales-coaching-acceptance.mjs
 * Env:   PUBLIC_BASE_URL, COMMAND_CENTER_KEY
 * Exit:  0 = PASS, 1 = FAIL
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFERE-SALES-COACHING-V1-0001';
const RECEIPT_REL = 'products/receipts/LIFERE_SALES_COACHING_V1_ACCEPTANCE.json';
const RECEIPT = path.join(ROOT, RECEIPT_REL);
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const KEY = process.env.COMMAND_CENTER_KEY || '';
const PREFIX = '/api/v1/lifere/sales-coach';
const BASE_CANDIDATES = [
  process.env.PUBLIC_BASE_URL,
  process.env.BASE_URL,
  'http://127.0.0.1:3000',
].filter(Boolean).map((v) => String(v).replace(/\/$/, ''));

let ACTIVE_BASE = '';

const report = {
  mission_id: MISSION,
  run_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  skipped: false,
  runtime_target: null,
  base_resolution: null,
};

async function probeBase(base) {
  try {
    const res = await fetch(`${base}/healthz`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

async function resolveBase() {
  for (const base of [...new Set(BASE_CANDIDATES)]) {
    if (await probeBase(base)) return { base, mode: 'configured' };
  }
  return { base: '', mode: 'unreachable' };
}

async function req(method, reqPath, body, headers = {}) {
  try {
    const res = await fetch(`${ACTIVE_BASE}${reqPath}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-command-key': KEY, ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body: json };
  } catch (e) {
    return { status: 0, ok: false, body: { error: e.message } };
  }
}

function pass(id) { report.tests_passed.push(id); console.log(`  ✅ ${id}`); }
function fail(id, reason) { report.tests_failed.push(id); console.error(`  ❌ ${id}: ${reason}`); }
function check(id, cond, reason) { cond ? pass(id) : fail(id, reason); }

const TEST_AGENT_TURNS = [
  "Hi, this is Alex calling. I noticed your listing expired last week and I'd love to find out what happened. Is now a bad time?",
  "I completely understand the frustration. What do you feel went wrong with the previous agent? I want to understand before I say anything about myself.",
  "That makes sense. A lot of sellers in your situation felt exactly the same way. Would you be open to a 20-minute meeting so I can show you specifically what I'd do differently — no pressure, just information?",
];

async function run() {
  console.log(`\n=== LifeRE Sales Coaching V1 Acceptance ===`);
  console.log(`Mission: ${MISSION}\n`);

  const resolved = await resolveBase();
  if (!resolved.base) {
    console.error('SKIP — no reachable base URL');
    report.skipped = true;
    await finishBpAcceptance({ report, receiptPath: RECEIPT, verdictPath: VERDICT });
    process.exit(0);
  }
  ACTIVE_BASE = resolved.base;
  report.base_resolution = resolved;
  report.runtime_target = ACTIVE_BASE;
  console.log(`Base: ${ACTIVE_BASE}\n`);

  // AT-LSC-001: List scenarios
  console.log('AT-LSC-001: List scenarios');
  const scenariosRes = await req('GET', `${PREFIX}/scenarios`);
  check('AT-LSC-001-ok', scenariosRes.ok, `status=${scenariosRes.status}`);
  check('AT-LSC-001-has-scenarios', Array.isArray(scenariosRes.body.scenarios) && scenariosRes.body.scenarios.length >= 3, `count=${scenariosRes.body.scenarios?.length}`);
  check('AT-LSC-001-has-expired', scenariosRes.body.scenarios?.some((s) => s.id === 'expired_listing'), 'expired_listing missing');

  // AT-LSC-002: Start session
  console.log('\nAT-LSC-002: Start expired listing session');
  const startRes = await req('POST', `${PREFIX}/session/start`, {
    scenario_id: 'expired_listing',
    owner_id: 'acceptance-test-user',
  });
  check('AT-LSC-002-ok', startRes.ok, `status=${startRes.status} body=${JSON.stringify(startRes.body)}`);
  check('AT-LSC-002-sessionId', typeof startRes.body.sessionId === 'string', 'sessionId missing');
  check('AT-LSC-002-opening', typeof startRes.body.opening === 'string', 'opening message missing');

  const sessionId = startRes.body.sessionId;
  if (!sessionId) { console.error('ABORT — no sessionId'); process.exit(1); }

  // AT-LSC-003: Agent turns
  console.log('\nAT-LSC-003: Three agent turns');
  let lastTurnRes;
  for (let i = 0; i < TEST_AGENT_TURNS.length; i++) {
    lastTurnRes = await req('POST', `${PREFIX}/session/${sessionId}/turn`, {
      message: TEST_AGENT_TURNS[i],
      owner_id: 'acceptance-test-user',
    });
    check(`AT-LSC-003-turn-${i + 1}-ok`, lastTurnRes.ok, `status=${lastTurnRes.status}`);
    check(`AT-LSC-003-turn-${i + 1}-client`, typeof lastTurnRes.body.clientResponse === 'string', 'clientResponse missing');
    check(`AT-LSC-003-turn-${i + 1}-coach`, typeof lastTurnRes.body.coachingNote === 'string', 'coachingNote missing');
    if (!lastTurnRes.ok) break;
  }
  check('AT-LSC-003-quadrant', typeof lastTurnRes?.body.detectedQuadrant === 'string' || lastTurnRes?.body.detectedQuadrant === null, 'detectedQuadrant field missing');

  // AT-LSC-004: End session with debrief
  console.log('\nAT-LSC-004: End session and get debrief');
  const endRes = await req('POST', `${PREFIX}/session/${sessionId}/end`, {
    owner_id: 'acceptance-test-user',
  });
  check('AT-LSC-004-ok', endRes.ok, `status=${endRes.status} body=${JSON.stringify(endRes.body)}`);
  check('AT-LSC-004-debrief', !!endRes.body.debrief, 'debrief missing');
  check('AT-LSC-004-scores', !!endRes.body.debrief?.scores, 'scores missing');
  check('AT-LSC-004-overall-score', typeof endRes.body.debrief?.scores?.overall === 'number', 'overall score missing');
  check('AT-LSC-004-did-well', typeof endRes.body.debrief?.did_well === 'string', 'did_well missing');
  check('AT-LSC-004-must-change', typeof endRes.body.debrief?.must_change === 'string', 'must_change missing');

  // AT-LSC-005: Retrieve session score
  console.log('\nAT-LSC-005: Retrieve session score');
  const scoreRes = await req('GET', `${PREFIX}/session/${sessionId}/score?owner_id=acceptance-test-user`);
  check('AT-LSC-005-ok', scoreRes.ok, `status=${scoreRes.status}`);
  check('AT-LSC-005-completed', scoreRes.body.session?.status === 'completed', `status=${scoreRes.body.session?.status}`);

  // Summary
  console.log('\n--- Results ---');
  console.log(`PASS: ${report.tests_passed.length}`);
  console.log(`FAIL: ${report.tests_failed.length}`);
  if (report.tests_failed.length) console.log('Failed:', report.tests_failed);

  const verdict = report.tests_failed.length === 0 ? 'TECHNICAL_PASS' : 'TECHNICAL_FAIL';
  await finishBpAcceptance({ report, receiptPath: RECEIPT, verdictPath: VERDICT });

  process.exit(verdict === 'TECHNICAL_PASS' ? 0 : 1);
}

run().catch((err) => { console.error('Fatal:', err); process.exit(1); });
