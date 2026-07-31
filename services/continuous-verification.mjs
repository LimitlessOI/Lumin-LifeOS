/**
 * SYNOPSIS: Continuous Verification Heartbeat — re-run governance checks and pause autonomy on failure.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { execFile } from 'node:child_process';
import { promises as fs, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT_CHECKS = [
  {
    name: 'builder_preflight',
    command: ['npm', 'run', 'builder:preflight'],
    timeout: 300_000,
    reason: 'Preflight suite is the broadest cheap signal of system health.',
  },
  {
    name: 'bp_priority_verify',
    command: ['npm', 'run', 'lifeos:bp-priority:verify'],
    timeout: 120_000,
    reason: 'Blueprint-priority gate must remain green.',
  },
  {
    name: 'ssot_baseline',
    command: ['node', 'scripts/verify-ssot-baseline.mjs'],
    timeout: 120_000,
    reason: 'SSOT debt must not regress beyond the approved baseline.',
  },
  {
    name: 'false_done_audit',
    command: ['node', 'scripts/audit-false-done-steps.mjs', '--ci'],
    timeout: 120_000,
    reason: 'False-done drift must be zero or explicitly waived.',
  },
];

function getNow() {
  return new Date().toISOString();
}

function runCommand(argv, cwd, timeout, logger) {
  return new Promise((resolve) => {
    const [file, ...args] = argv;
    logger?.debug?.(`[CV] Running: ${file} ${args.join(' ')} in ${cwd}`);
    const child = execFile(file, args, { cwd, timeout, shell: false }, (error, stdout, stderr) => {
      if (error && error.code === 'ENOENT') {
        return resolve({ exitCode: null, stdout: stdout || '', stderr: `Command not found: ${file}` });
      }
      return resolve({
        exitCode: error ? (error.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });
    child.on('error', (err) => {
      resolve({ exitCode: null, stdout: '', stderr: `Process error: ${err.message}` });
    });
  });
}

export async function pauseAutonomy({ reason, repoRoot = process.cwd(), receiptDir = 'products/receipts', alertFn }) {
  const ts = getNow();
  const stopPath = join(repoRoot, 'builderos-reboot/FOUNDER_STOP.json');
  let existing = {};
  try {
    const raw = await fs.readFile(stopPath, 'utf8');
    existing = JSON.parse(raw);
  } catch {
    // no existing stop file
  }
  const stop = {
    ...existing,
    stop: true,
    paused_by: 'continuous-verification',
    paused_at: ts,
    reason,
  };
  await fs.mkdir(join(repoRoot, 'builderos-reboot'), { recursive: true });
  await fs.writeFile(stopPath, `${JSON.stringify(stop, null, 2)}\n`);

  const receipt = {
    kind: 'continuous_verification_pause',
    paused_at: ts,
    reason,
    stop_path: stopPath,
  };

  if (alertFn) {
    try {
      await alertFn(receipt);
    } catch (err) {
      // alert failure must not hide the pause
      receipt.alert_error = String(err?.message || err);
    }
  }

  const receiptPath = join(repoRoot, receiptDir, `CONTINUOUS_VERIFICATION_PAUSE_${ts.replace(/[:.]/g, '-')}.json`);
  try {
    await fs.mkdir(join(repoRoot, receiptDir), { recursive: true });
    await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  } catch {
    // receipt is best-effort; stop file is the fail-closed signal
  }

  return { paused: true, stop_path: stopPath, receipt_path: receiptPath, reason };
}

export async function runContinuousVerification(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const checks = options.checks || DEFAULT_CHECKS;
  const logger = options.logger || console;
  const pauseFn = options.pauseFn || pauseAutonomy;
  const ts = getNow();

  const results = [];
  let allOk = true;

  for (const check of checks) {
    const result = await runCommand(check.command, repoRoot, check.timeout || 120_000, logger);
    const ok = result.exitCode === 0;
    if (!ok) allOk = false;
    results.push({
      name: check.name,
      ok,
      exit_code: result.exitCode,
      stdout: result.stdout.slice(0, 2000),
      stderr: result.stderr.slice(0, 2000),
      reason: check.reason,
    });
  }

  const receipt = {
    kind: 'continuous_verification',
    run_at: ts,
    all_ok: allOk,
    checks: results,
  };

  let pauseResult = null;
  if (!allOk) {
    const failing = results.filter((r) => !r.ok).map((r) => r.name);
    pauseResult = await pauseFn({
      reason: `Governance checks failed: ${failing.join(', ')}`,
      repoRoot,
      alertFn: options.alertFn,
      receiptDir: options.receiptDir,
    });
  }

  return {
    ok: allOk,
    run_at: ts,
    checks: results,
    paused: Boolean(pauseResult),
    pause_result: pauseResult,
    receipt,
  };
}

export function createContinuousVerificationScheduler(options = {}) {
  const { createUsefulWorkGuard } = options;
  if (typeof createUsefulWorkGuard !== 'function') {
    throw new Error('createUsefulWorkGuard is required for the scheduler');
  }
  const intervalMs = Number(options.intervalMs) || 60 * 60 * 1000;
  const repoRoot = options.repoRoot || process.cwd();

  return createUsefulWorkGuard({
    taskName: 'CONTINUOUS-VERIFICATION-HEARTBEAT',
    purpose: 'Re-run builder:preflight, bp-priority verify, ssot-check, and false-done audit; pause autonomy if any fail.',
    allowInDirectedMode: true,
    prerequisites: async () => {
      // Do not run if already paused; one pause receipt is enough.
      const stopPath = resolve(repoRoot, 'builderos-reboot/FOUNDER_STOP.json');
      if (existsSync(stopPath)) {
        try {
          const raw = await fs.readFile(stopPath, 'utf8');
          const data = JSON.parse(raw);
          if (data.stop === true) {
            return { ok: false, reason: 'founder_stop_active' };
          }
        } catch {
          // malformed stop file; continue and let the run repopulate it if needed
        }
      }
      return { ok: true, reason: null };
    },
    workCheck: async () => ({ count: 1, description: 'heartbeat due' }),
    execute: async () => {
      return runContinuousVerification({
        repoRoot,
        checks: options.checks,
        logger: options.logger,
        pauseFn: options.pauseFn,
        alertFn: options.alertFn,
      });
    },
    logger: options.logger,
  });
}
