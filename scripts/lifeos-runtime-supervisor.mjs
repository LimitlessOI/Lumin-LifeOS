/**
 * SYNOPSIS: Runtime supervisor that keeps `node server.js` alive and auto-restarts it.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Watches the server process and healthz endpoint. Restarts on exit or degraded
 * health. After 3 consecutive boot failures it pauses and logs an escalation
 * marker so a child session / conductor can be summoned.
 */
import 'dotenv/config';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync, createWriteStream } from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const SERVER_LOG = process.env.SUPERVISOR_LOG || '/tmp/lifeos-server.log';
const PID_FILE = '/tmp/lifeos-runtime.pid';
const SUPERVISOR_PID_FILE = '/tmp/lifeos-supervisor.pid';
const HEALTH_URL = `http://127.0.0.1:${process.env.PORT || 3000}/healthz`;
const HEALTH_INTERVAL_MS = Number(process.env.SUPERVISOR_HEALTH_INTERVAL_MS || 30000);
const MAX_BOOT_FAILURES = 3;
const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000;

let bootFailures = 0;
let child = null;
let healthTimer = null;
let lastRestartAt = 0;

function log(msg, extra = {}) {
  const line = JSON.stringify({ at: new Date().toISOString(), msg, ...extra });
  // eslint-disable-next-line no-console
  console.log(line);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHealth() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }
    return { ok: res.ok && res.status === 200, status: res.status, json };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function killChild(sig = 'SIGTERM') {
  if (!child) return;
  try {
    child.kill(sig);
  } catch (err) {
    log('failed to kill child', { error: err.message });
  }
}

function startServer() {
  if (child) return;

  const now = Date.now();
  const elapsed = now - lastRestartAt;
  const backoff = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** Math.min(bootFailures, 6));
  if (bootFailures > 0 && elapsed < backoff) {
    const wait = backoff - elapsed;
    log('backing off before restart', { bootFailures, waitMs: wait });
    setTimeout(startServer, wait);
    return;
  }

  log('starting server', { bootFailures });
  lastRestartAt = now;

  child = spawn('node', ['server.js'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const out = createWriteStream(SERVER_LOG, { flags: 'a' });
  child.stdout.pipe(out);
  child.stderr.pipe(out);

  try {
    writeFileSync(PID_FILE, String(child.pid));
  } catch (err) {
    log('could not write pid file', { error: err.message });
  }

  child.on('exit', (code, signal) => {
    log('server exited', { code, signal, pid: child?.pid });
    child = null;
    bootFailures += 1;
    if (bootFailures >= MAX_BOOT_FAILURES) {
      log('ESCALATION: server failed to boot 3 times; waiting for conductor intervention', { bootFailures });
      // Keep supervisor alive; a child session or conductor can fix and SIGHUP.
      return;
    }
    startServer();
  });

  child.on('error', (err) => {
    log('server process error', { error: err.message });
  });
}

async function healthCheck() {
  const health = await fetchHealth();
  if (!health.ok) {
    log('health check failed', health);
    if (child) {
      bootFailures += 1;
      log('restarting server due to health failure', { bootFailures });
      killChild('SIGTERM');
      await sleep(2000);
      // on('exit') handler will restart with backoff
      return;
    }
  }

  if (health.ok && health.json && health.json.degraded === false) {
    bootFailures = 0;
  }
}

function stop() {
  log('supervisor stopping');
  if (healthTimer) clearInterval(healthTimer);
  killChild('SIGTERM');
  try { unlinkSync(PID_FILE); } catch { /* ignore */ }
  process.exit(0);
}

async function main() {
  log('supervisor starting', { pid: process.pid, port: process.env.PORT || 3000 });
  try {
    writeFileSync(SUPERVISOR_PID_FILE, String(process.pid));
  } catch (err) {
    log('could not write supervisor pid file', { error: err.message });
  }

  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  process.on('SIGHUP', () => {
    log('SIGHUP received; resetting boot failure count and restarting server');
    bootFailures = 0;
    killChild('SIGTERM');
  });

  // In case a previous server is still bound to the port, terminate it.
  try {
    const oldPid = existsSync(PID_FILE) ? Number(readFileSync(PID_FILE, 'utf8')) : 0;
    if (oldPid > 0) {
      process.kill(oldPid, 'SIGTERM');
      log('terminated previous server process', { oldPid });
    }
  } catch (err) {
    if (err.code !== 'ESRCH') log('could not terminate previous server', { error: err.message });
  }

  startServer();

  // Give the first boot a moment before health-checking.
  await sleep(5000);
  healthTimer = setInterval(() => healthCheck().catch((err) => log('health check threw', { error: err.message })), HEALTH_INTERVAL_MS);
}

main().catch((err) => {
  log('supervisor crashed', { error: err.message, stack: err.stack });
  process.exit(1);
});
