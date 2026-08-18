#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  ensureCostelloInfrastructure,
  getCostelloInfrastructureGuardianStatus,
} from '../services/costello-infrastructure-guardian.js';

const STATUS_FILE = process.env.COSTELLO_GUARDIAN_STATUS_FILE || '/tmp/costello-infrastructure-guardian-status.json';
const INTERVAL_MS = Number(process.env.COSTELLO_INFRA_GUARDIAN_INTERVAL_MS || 2 * 60 * 1000);
const BOOT_DELAY_MS = Number(process.env.COSTELLO_INFRA_BOOT_DELAY_MS || 5_000);
let inFlight = false;
let stopping = false;

function persist(extra = {}) {
  const body = {
    schema: 'costello_infrastructure_guardian_worker_status_v1',
    worker_pid: process.pid,
    worker_alive: true,
    at: new Date().toISOString(),
    ...getCostelloInfrastructureGuardianStatus(),
    ...extra,
  };
  try {
    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
    const temp = `${STATUS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(body, null, 2)}\n`);
    fs.renameSync(temp, STATUS_FILE);
  } catch (error) {
    console.error('[COSTELLO-GUARDIAN-WORKER] status write failed', error?.message || error);
  }
}

async function tick() {
  if (stopping || inFlight) return;
  inFlight = true;
  persist({ worker_phase: 'tick_start' });
  try {
    const result = await ensureCostelloInfrastructure({ logger: console });
    persist({ worker_phase: result?.ok ? 'healthy' : 'recovering', last_result: result || null });
  } catch (error) {
    persist({ worker_phase: 'worker_error', worker_error: String(error?.message || error) });
    console.error('[COSTELLO-GUARDIAN-WORKER] tick failed', error);
  } finally {
    inFlight = false;
  }
}

function shutdown(signal) {
  stopping = true;
  persist({ worker_alive: false, worker_phase: 'stopping', stop_signal: signal });
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  persist({ worker_alive: false, worker_phase: 'uncaught_exception', worker_error: String(error?.stack || error) });
  process.exit(1);
});
process.on('unhandledRejection', (error) => {
  persist({ worker_alive: false, worker_phase: 'unhandled_rejection', worker_error: String(error?.stack || error) });
  process.exit(1);
});

persist({ worker_phase: 'booting', boot_delay_ms: BOOT_DELAY_MS, interval_ms: INTERVAL_MS });
const boot = setTimeout(() => { tick(); }, BOOT_DELAY_MS);
const timer = setInterval(() => { tick(); }, INTERVAL_MS);
boot.unref?.();
timer.unref?.();

// Keep the worker alive independently of unref'd timers.
setInterval(() => persist({ worker_phase: inFlight ? 'in_flight' : 'idle' }), 30_000);
