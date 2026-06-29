#!/usr/bin/env node
/**
 * SYNOPSIS: Never-stop BP_PRIORITY runner — retries FAIL until TECHNICAL_PASS or founder_stop.
 * Never-stop BP_PRIORITY runner — retries FAIL until TECHNICAL_PASS or founder_stop.
 * @ssot builderos-reboot/BP_PRIORITY.json
 * @ssot docs/products/AUTHORITY_BOUNDARIES.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { getActiveQueueItem } from '../services/bp-priority-completion.js';
import { runFoundationPipelineLoop } from '../factory-staging/factory-core/arc/run-foundation.js';
import { founderStopActive } from '../factory-staging/factory-core/arc/gate-enforcement.js';
import { loadPointBTarget } from '../factory-staging/factory-core/arc/foundation/point-b-target.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json');
const LOG_PATH = path.join(ROOT, 'data/bp-priority-never-stop-log.jsonl');

const once = process.argv.includes('--once');
const sleepMs = Number(process.argv.find((a) => a.startsWith('--sleep-ms='))?.split('=')[1] || 60_000);
const neverStop = process.env.BUILDEROS_NEVER_STOP === '1'
  || process.env.NEVER_STOP_PRODUCTS === '1'
  || process.env.BUILDEROS_AUTOPILOT === '1';

function log(row) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
}

function loadQueue() {
  return JSON.parse(fs.readFileSync(BP_PATH, 'utf8'));
}

function activeMission(items) {
  const pointB = loadPointBTarget();
  return getActiveQueueItem(items || [], { pointBTarget: pointB });
}

function tryRedeploy() {
  const r = spawnSync('npm', ['run', 'system:railway:redeploy'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 720_000,
    shell: true,
  });
  return { ok: r.status === 0, status: r.status, stderr: String(r.stderr || '').slice(0, 300) };
}

function runPreBuildGate() {
  const r = spawnSync('npm', ['run', 'builderos:pre-build-gate', '--', '--allow-stale'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  });
  return { ok: r.status === 0, status: r.status, stdout: String(r.stdout || '').slice(0, 500) };
}

function runCycle() {
  const stop = founderStopActive();
  if (stop.active && !neverStop) {
    log({ event: 'founder_stop', path: stop.path });
    return { halt: true, reason: 'founder_stop' };
  }
  if (stop.active && neverStop) {
    log({ event: 'founder_stop_ignored', path: stop.path, mode: 'never_stop' });
  }

  const gate = runPreBuildGate();
  if (!gate.ok) {
    log({ event: 'pre_build_gate_fail', status: gate.status, detail: gate.stdout });
    return { halt: false, reason: 'pre_build_gate_fail' };
  }

  const queue = loadQueue();
  const mission = activeMission(queue.items || []);
  if (!mission) {
    log({ event: 'queue_complete', never_stop: neverStop });
    if (neverStop) {
      return { halt: false, reason: 'queue_complete_expansion' };
    }
    return { halt: true, reason: 'queue_complete' };
  }

  log({ event: 'cycle_start', mission_id: mission.mission_id, rank: mission.rank, verdict: mission.verdict, point_b: loadPointBTarget()?.label });

  while (true) {
    if (founderStopActive().active && !neverStop) {
      log({ event: 'founder_stop' });
      return { halt: true, reason: 'founder_stop' };
    }

    const started = Date.now();
    const last = runFoundationPipelineLoop(mission.mission_id, { force: true, maxAttempts: 64, cookingSliceSize: 32 });
    log({
      event: 'foundation_run',
      mission_id: mission.mission_id,
      ok: last.ok,
      point_b_reached: last.point_b_reached,
      total_attempts: last.loopReceipt?.total_attempts,
      obstacles: last.loopReceipt?.obstacles?.length,
    });

    if (last.ok && last.point_b_reached) {
      return { halt: false, defect: false, mission_id: mission.mission_id, last, point_b: true };
    }

    if (last.founder_stop && !neverStop) {
      return { halt: true, reason: 'founder_stop' };
    }

    spawnSync('sleep', [String(Math.ceil(sleepMs / 1000))], { cwd: ROOT });
  }
}

if (once) {
  (async () => {
    const result = runCycle();
    if (result.reason === 'queue_complete_expansion' && neverStop) {
      const { runProductExpansionCycle } = await import('../services/never-stop-product-factory.js');
      const exp = await runProductExpansionCycle({ logger: console });
      process.exit(exp.ok !== false ? 0 : 1);
    }
    process.exit(result.defect ? 1 : 0);
  })();
} else {
  console.log('BP priority never-stop runner — continuous until token exhaustion when NEVER_STOP enabled');
  (async () => {
    while (true) {
      const result = runCycle();
      if (result.halt && !neverStop) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.defect ? 1 : 0);
      }
      if (result.halt && neverStop) {
        log({ event: 'halt_bypassed', reason: result.reason });
      }
      if (result.defect && !neverStop) {
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
      }
      if (result.reason === 'queue_complete_expansion') {
        const { runProductExpansionCycle } = await import('../services/never-stop-product-factory.js');
        await runProductExpansionCycle({ logger: console });
      }
      if (result.reason === 'queue_complete_expansion' || result.reason === 'pre_build_gate_fail') {
        spawnSync('sleep', [String(Math.ceil(sleepMs / 1000))], { cwd: ROOT });
      }
    }
  })();
}
