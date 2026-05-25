#!/usr/bin/env node
/**
 * C2 governed overnight autonomy orchestrator — additive, honest telemetry only.
 * Calls existing POST /autonomous-telemetry/session/run in a bounded loop.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import 'dotenv/config';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });

const ROOT = process.cwd();
const LOG_PATH = path.join(ROOT, 'data', 'governed-autonomy-overnight-log.jsonl');
const STATE_PATH = path.join(ROOT, 'data', 'governed-autonomy-overnight-state.json');
const LOCK_PATH = path.join(ROOT, 'data', 'governed-autonomy-overnight.lock');

const ONCE = process.argv.includes('--once');
const intervalArg = process.argv.indexOf('--interval-min');
const durationArg = process.argv.indexOf('--run-for-min');
const intervalMin = Math.max(
  5,
  Number(intervalArg >= 0 ? process.argv[intervalArg + 1] : process.env.GOVERNED_AUTONOMY_INTERVAL_MIN || 20) || 20,
);
const runForMin = Math.max(
  0,
  Number(durationArg >= 0 ? process.argv[durationArg + 1] : process.env.GOVERNED_AUTONOMY_RUN_FOR_MIN || 0) || 0,
);

const base = (
  process.env.PUBLIC_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  'https://robust-magic-production.up.railway.app'
).replace(/\/+$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function appendLog(event, payload = {}) {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  const line = `${JSON.stringify({ ts: new Date().toISOString(), event, ...payload })}\n`;
  await fs.appendFile(LOG_PATH, line, 'utf8');
  console.log(line.trimEnd());
}

async function writeState(state) {
  await fs.writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function api(method, apiPath, body) {
  const headers = { 'x-command-key': key, 'Content-Type': 'application/json' };
  const res = await fetch(`${base}${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  return { status: res.status, body: parsed };
}

async function runBatch(batchNo) {
  const t0 = Date.now();
  const readiness = await api('GET', '/api/v1/lifeos/command-center/supervised-autonomy/readiness');
  const r = readiness.body || {};

  await appendLog('batch_readiness', {
    batch_no: batchNo,
    proof: r.proof_freshness_overall,
    ready: r.ready_for_supervised,
    repair_queue: r.repair_queue_open,
    adam_required: (r.adam_required_actions || []).length,
  });

  if ((r.adam_required_actions || []).length > 0) {
    return { halt: true, reason: 'adam_required_stop', adam_required: r.adam_required_actions };
  }

  if (r.proof_freshness_overall === 'STALE') {
    await appendLog('stale_proof_detected', { batch_no: batchNo, action: 'session_will_run_prevention_hook' });
  }

  const session = await api('POST', '/api/v1/lifeos/autonomous-telemetry/session/run', {
    max_cycles: 10,
    max_minutes: 55,
    triggered_by: 'C2-governed-overnight-autonomy',
  });

  const eff = await api('GET', '/api/v1/lifeos/autonomous-telemetry/efficiency?since_hours=6');

  const successfulCycles = (session.body?.cycles || []).filter((c) => c.success).length;
  const failedCycles = (session.body?.cycles || []).filter((c) => !c.success).length;
  const noOp =
    successfulCycles === 0 &&
    failedCycles > 0 &&
    (session.body?.cycles || []).every((c) =>
      ['verification.proof_freshness', 'self_repair.executor_dry_run'].includes(c.task_type),
    );

  await appendLog('batch_complete', {
    batch_no: batchNo,
    http: session.status,
    session_id: session.body?.session_id,
    cycles: session.body?.cycles_completed,
    successful_cycles: successfulCycles,
    failed_cycles: failedCycles,
    no_op_suspected: noOp,
    wall_ms: Date.now() - t0,
    efficiency: eff.body?.metrics || null,
    event_count: eff.body?.event_count || null,
  });

  return {
    halt: session.body?.halted === true,
    reason: session.body?.reason || null,
    no_op: noOp,
    session_id: session.body?.session_id,
  };
}

async function main() {
  if (!key) {
    console.error('HALT: COMMAND_CENTER_KEY missing');
    process.exit(2);
  }

  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  const startedAt = Date.now();
  const deadline = runForMin > 0 ? startedAt + runForMin * 60 * 1000 : null;
  let batchNo = 0;

  await appendLog('orchestrator_start', {
    base,
    interval_min: intervalMin,
    run_for_min: runForMin || null,
    once: ONCE,
    authorized: 'ADAM_AUTHORIZED',
  });

  while (true) {
    batchNo += 1;
    let outcome;
    try {
      outcome = await runBatch(batchNo);
    } catch (err) {
      await appendLog('batch_error', { batch_no: batchNo, error: err.message?.slice(0, 300) });
      outcome = { halt: false, error: err.message };
    }

    await writeState({
      status: outcome.halt ? 'halted' : 'running',
      batch_no: batchNo,
      last_outcome: outcome,
      updated_at: new Date().toISOString(),
      started_at: new Date(startedAt).toISOString(),
    });

    if (outcome.halt) {
      await appendLog('orchestrator_halt', { batch_no: batchNo, reason: outcome.reason, adam_required: outcome.adam_required });
      break;
    }

    if (ONCE) break;
    if (deadline && Date.now() >= deadline) {
      await appendLog('orchestrator_deadline', { batch_no: batchNo, run_for_min: runForMin });
      break;
    }

    await sleep(intervalMin * 60 * 1000);
  }

  await appendLog('orchestrator_stop', {
    batches: batchNo,
    total_wall_ms: Date.now() - startedAt,
  });
}

main().catch(async (err) => {
  await appendLog('orchestrator_crash', { error: err.message }).catch(() => {});
  console.error(err);
  process.exit(1);
});
