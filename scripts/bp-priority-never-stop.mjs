#!/usr/bin/env node
/**
 * Never-stop BP_PRIORITY runner — retries FAIL until TECHNICAL_PASS or founder_stop.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runFoundationPipeline } from '../../factory-staging/factory-core/arc/run-foundation.js';
import { founderStopActive } from '../../factory-staging/factory-core/arc/gate-enforcement.js';
import { appendMissionLedger } from '../../factory-staging/factory-core/arc/foundation/mission-ledger.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BP_PATH = path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json');
const LOG_PATH = path.join(ROOT, 'data/bp-priority-never-stop-log.jsonl');

const once = process.argv.includes('--once');
const maxRetries = Number(process.argv.find((a) => a.startsWith('--max-retries='))?.split('=')[1] || 5);
const sleepMs = Number(process.argv.find((a) => a.startsWith('--sleep-ms='))?.split('=')[1] || 60_000);

function log(row) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
}

function loadQueue() {
  return JSON.parse(fs.readFileSync(BP_PATH, 'utf8'));
}

function isComplete(item) {
  const v = String(item.verdict || '').toUpperCase();
  return v === 'TECHNICAL_PASS' || v === 'PASS';
}

function activeMission(items) {
  return [...items].sort((a, b) => a.rank - b.rank).find((i) => !isComplete(i));
}

function tryRedeploy() {
  const r = spawnSync('npm', ['run', 'system:railway:redeploy'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    shell: true,
  });
  return { ok: r.status === 0, status: r.status, stderr: String(r.stderr || '').slice(0, 300) };
}

function runCycle() {
  const stop = founderStopActive();
  if (stop.active) {
    log({ event: 'founder_stop', path: stop.path });
    return { halt: true, reason: 'founder_stop' };
  }

  const queue = loadQueue();
  const mission = activeMission(queue.items || []);
  if (!mission) {
    log({ event: 'queue_complete' });
    return { halt: true, reason: 'queue_complete' };
  }

  log({ event: 'cycle_start', mission_id: mission.mission_id, rank: mission.rank, verdict: mission.verdict });

  let attempt = 0;
  let last = null;

  while (attempt < maxRetries) {
    attempt += 1;
    const started = Date.now();
    last = runFoundationPipeline(mission.mission_id, { force: attempt === 1 });
    appendMissionLedger({
      mission_id: mission.mission_id,
      event: `never_stop_attempt_${attempt}`,
      runner: 'bp-priority-never-stop.mjs',
      latency_ms: Date.now() - started,
      verdict: last.ok ? 'PASS' : 'FAIL',
    });
    log({
      event: 'foundation_run',
      mission_id: mission.mission_id,
      attempt,
      ok: last.ok,
      violations: last.report?.stages?.final_gate?.violations || [],
    });

    if (last.ok) break;

    const acceptanceFail = last.report?.stages?.builder?.ok === false;
    if (acceptanceFail) {
      const redeploy = tryRedeploy();
      log({ event: 'redeploy', ok: redeploy.ok, status: redeploy.status });
    }

    if (attempt < maxRetries) {
      spawnSync('sleep', [String(Math.ceil(sleepMs / 1000))], { cwd: ROOT });
    }
  }

  if (!last?.ok) {
    log({
      event: 'RUNNER_HALT_DEFECT',
      mission_id: mission.mission_id,
      attempts: attempt,
      note: 'Fix blocker and re-run; only founder_stop may halt intentionally',
    });
    return { halt: false, defect: true, mission_id: mission.mission_id, last };
  }

  return { halt: false, defect: false, mission_id: mission.mission_id, last };
}

if (once) {
  const result = runCycle();
  process.exit(result.defect ? 1 : 0);
}

console.log('BP priority never-stop runner — loop until founder_stop or queue complete');
while (true) {
  const result = runCycle();
  if (result.halt) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }
  if (result.defect) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}
