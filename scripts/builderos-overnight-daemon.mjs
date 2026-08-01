/**
 * SYNOPSIS: Overnight self-scheduling daemon for BuilderOS.
 * Runs self-heal, drift repair, and bp-priority:once on a configurable interval,
 * logs every cycle, and halts cleanly when no actionable work exists or budget cap hit.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUsefulWorkGuard } from '../services/useful-work-guard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAEMON_LOG = path.join(ROOT, 'data/bp-priority-never-stop-log.jsonl');
const DEFAULT_INTERVAL_MS = Number(process.env.OVERNIGHT_DAEMON_INTERVAL_MS) || 300000;
const MAX_IDENTICAL_FAILURES = Number(process.env.OVERNIGHT_DAEMON_MAX_REPEAT_FAILURES) || 6;

function logLine(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  fs.mkdirSync(path.dirname(DAEMON_LOG), { recursive: true });
  fs.appendFileSync(DAEMON_LOG, line, 'utf8');
}

function runShell(command, label) {
  try {
    const out = execSync(command, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, label, command, output: out.slice(0, 4000) };
  } catch (err) {
    return { ok: false, label, command, output: err.stdout?.slice(0, 4000) || '', error: err.message };
  }
}

function countPendingProducts() {
  try {
    const out = execSync('node scripts/build-queue-drift-repair.mjs --dry-run --summary', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const m = out.match(/Dry-run: ([0-9]+) steps need repair/);
    return Number(m?.[1]) || 0;
  } catch {
    return 0;
  }
}

const daemonTask = createUsefulWorkGuard({
  taskName: 'builderos-overnight-daemon',
  purpose: 'Keep the never-stop factory clearing BUILD_QUEUE while the founder is away, without burning tokens when nothing is actionable.',
  prerequisites: async () => {
    if (process.env.PAUSE_AUTONOMY === '1') return { ok: false, reason: 'PAUSE_AUTONOMY=1' };
    return { ok: true };
  },
  workCheck: async () => {
    const pending = countPendingProducts();
    if (pending > 0) return { count: pending, description: `${pending} BUILD_QUEUE steps need repair` };
    try {
      const out = execSync('BUILDEROS_NEVER_STOP=1 npm run builderos:bp-priority:once -- --dry-run', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
      const m = out.match(/ok:\s*(true|false)/);
      const hasWork = m && m[1] === 'true';
      return { count: hasWork ? 1 : 0, description: 'bp-priority:once dry-run result' };
    } catch {
      return { count: 1, description: 'bp-priority dry-run unavailable; run anyway' };
    }
  },
  execute: async () => {
    const cycle = { step: 'cycle_start' };
    logLine(cycle);

    const selfHeal = runShell('node scripts/audit-false-done-steps.mjs', 'audit_false_done');
    logLine({ step: 'self_heal', result: selfHeal.ok ? 'pass' : 'fail', detail: selfHeal.ok ? 'HARD=0 SOFT=0' : selfHeal.error });

    const repair = runShell('node scripts/build-queue-drift-repair.mjs --apply', 'drift_repair');
    logLine({ step: 'drift_repair', result: repair.ok ? 'pass' : 'partial', detail: repair.output.slice(0, 500) });

    const bp = runShell('BUILDEROS_NEVER_STOP=1 npm run builderos:bp-priority:once', 'bp_priority_once');
    logLine({ step: 'bp_priority_once', result: bp.ok ? 'pass' : 'fail', detail: bp.output.slice(0, 500) });

    return {
      ok: bp.ok,
      steps: ['audit_false_done', 'drift_repair', 'bp_priority_once'],
      results: { selfHeal, repair, bp },
    };
  },
  logger: console,
});

export async function runOnce() {
  if (process.env.PAUSE_AUTONOMY === '1') {
    logLine({ step: 'halt', reason: 'PAUSE_AUTONOMY=1' });
    return 'paused';
  }
  const result = await daemonTask();
  logLine({ step: 'cycle_end', result: result.skipped ? 'skipped' : result.ok ? 'ok' : 'fail', reason: result.reason || result.detail });
  return result;
}

async function main() {
  const failures = [];
  let cycles = 0;
  const mode = process.argv.includes('--once') ? 'once' : 'daemon';

  if (mode === 'once') {
    await runOnce();
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    cycles += 1;
    const result = await runOnce();
    if (result === 'paused') break;

    if (!result.ok && !result.skipped) {
      failures.push(result.error || result.detail || 'unknown');
      const tail = failures.slice(-MAX_IDENTICAL_FAILURES);
      if (tail.length >= MAX_IDENTICAL_FAILURES && new Set(tail).size === 1) {
        logLine({ step: 'halt', reason: `same failure repeated ${MAX_IDENTICAL_FAILURES} times`, last_error: tail[0] });
        break;
      }
    } else if (result.skipped && result.reason !== 'directed_mode') {
      // Nothing actionable; wait and try again.
    }

    logLine({ step: 'sleep', interval_ms: DEFAULT_INTERVAL_MS, cycles });
    await new Promise((resolve) => setTimeout(resolve, DEFAULT_INTERVAL_MS));
  }
}

main().catch((err) => {
  logLine({ step: 'fatal', error: err.message });
  process.exit(1);
});
