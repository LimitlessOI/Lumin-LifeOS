#!/usr/bin/env node
/**
 * SYNOPSIS: Local never-stop product factory daemon — runs forever; only pauses on token exhaustion.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hasTokenCapacity,
  runProductExpansionCycle,
  neverStopProductsEnabled,
} from '../services/never-stop-product-factory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_PATH = path.join(ROOT, 'data/never-stop-product-factory-log.jsonl');
const HEARTBEAT_PATH = path.join(ROOT, 'data/never-stop-product-factory-heartbeat.json');

const sleepMs = Number(process.argv.find((a) => a.startsWith('--sleep-ms='))?.split('=')[1] || 120_000);
const tokenBackoffMs = Number(process.argv.find((a) => a.startsWith('--token-backoff-ms='))?.split('=')[1] || 600_000);

process.env.BUILDEROS_NEVER_STOP = process.env.BUILDEROS_NEVER_STOP || '1';
process.env.NEVER_STOP_PRODUCTS = process.env.NEVER_STOP_PRODUCTS || '1';

function heartbeat(row) {
  fs.mkdirSync(path.dirname(HEARTBEAT_PATH), { recursive: true });
  fs.writeFileSync(
    HEARTBEAT_PATH,
    `${JSON.stringify({ at: new Date().toISOString(), pid: process.pid, ...row }, null, 2)}\n`,
  );
}

function log(row) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
  console.log(JSON.stringify(row));
}

log({ event: 'daemon_start', never_stop: neverStopProductsEnabled(), sleep_ms: sleepMs });

let cycles = 0;
while (true) {
  cycles += 1;
  const token = hasTokenCapacity();
  if (!token.ok) {
    log({ event: 'token_halt', reason: token.reason, backoff_ms: tokenBackoffMs, cycles });
    heartbeat({ status: 'token_halt', cycles, reason: token.reason });
    await new Promise((r) => setTimeout(r, tokenBackoffMs));
    continue;
  }

  try {
    const result = await runProductExpansionCycle({ logger: console });
    log({ event: 'cycle', cycles, ok: result.ok, reason: result.reason, detail: result.detail, halted: result.halted });
    heartbeat({ status: result.halted ? 'token_halt' : 'running', cycles, last_ok: result.ok });
  } catch (err) {
    log({ event: 'cycle_error', cycles, error: err.message });
    heartbeat({ status: 'error', cycles, error: err.message });
  }

  await new Promise((r) => setTimeout(r, sleepMs));
}
