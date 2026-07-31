/**
 * SYNOPSIS: Receipt Auditor — replay OBJECTIVE_VERDICT and PASS receipts against reality.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { execFile } from 'node:child_process';
import { promises as fs, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { verdictFromReceipt } from './cognitive-core-oracle.js';

const DEFAULT_SAMPLE_MISSION = 'FACTORY-PATH-TO-TEN-0001';
const VERDICT_PASS = 'PASS';
const VERDICT_FAIL = 'FAIL';
const VERDICT_UNREPRODUCIBLE = 'UNREPRODUCIBLE';

function getNow() {
  return new Date().toISOString();
}

function normalizeCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return null;
  return command.trim();
}

function resolveReceiptInput(receipt) {
  if (receipt && typeof receipt === 'object' && !Array.isArray(receipt)) {
    return receipt;
  }
  return null;
}

function resolveCommand(receipt, opts) {
  return normalizeCommand(opts?.acceptance_command || opts?.verify_command)
    || normalizeCommand(receipt?.acceptance_command || receipt?.verify_command);
}

async function readReceipt(receipt, logger) {
  if (typeof receipt === 'string') {
    try {
      const text = await fs.readFile(resolve(receipt), 'utf8');
      return { parsed: JSON.parse(text), path: receipt };
    } catch (err) {
      logger.warn(`Failed to read receipt at ${receipt}: ${err.message}`);
      return { error: err };
    }
  }
  return { parsed: receipt, path: null };
}

function runCommand(command, cwd, logger) {
  return new Promise((resolvePromise) => {
    const parts = command.match(/"([^"]+)"|\S+/g) || [];
    const argv = parts.map((p) => (p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p));
    const [file, ...args] = argv;
    if (!file) {
      return resolvePromise({ exitCode: null, stdout: '', stderr: 'Empty command after parsing' });
    }

    logger.debug(`Running command: ${file} ${args.join(' ')} in ${cwd}`);
    const child = execFile(file, args, { cwd, timeout: 120_000, shell: false }, (error, stdout, stderr) => {
      if (error && error.code === 'ENOENT') {
        return resolvePromise({ exitCode: null, stdout: stdout || '', stderr: `Command not found: ${file}` });
      }
      return resolvePromise({
        exitCode: error ? (error.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });

    child.on('error', (err) => {
      resolvePromise({ exitCode: null, stdout: '', stderr: `Process error: ${err.message}` });
    });
  });
}

async function checkoutGitSha(gitSha, gitRemote, tmpBase, logger) {
  if (!gitRemote) {
    return { error: 'gitRemote is required for git checkout' };
  }
  if (!gitSha || gitSha === 'HEAD') {
    return { error: 'Cannot checkout a non-specific git SHA' };
  }

  const tempDir = await fs.mkdtemp(join(tmpBase, 'receipt-audit-'));
  try {
    await runCommand(`git clone ${gitRemote} .`, tempDir, logger);
    const checkout = await runCommand(`git checkout ${gitSha}`, tempDir, logger);
    if (checkout.exitCode !== 0) {
      return { error: `git checkout ${gitSha} failed: ${checkout.stderr}` };
    }
    return { checkoutPath: tempDir };
  } catch (err) {
    return { error: `Git checkout threw: ${err.message}` };
  }
}

async function cleanupCheckout(checkoutPath, logger) {
  if (checkoutPath && checkoutPath !== process.cwd() && existsSync(checkoutPath)) {
    try {
      await fs.rm(checkoutPath, { recursive: true, force: true });
      logger.debug(`Cleaned up temp checkout: ${checkoutPath}`);
    } catch (err) {
      logger.warn(`Failed to clean up temp checkout: ${err.message}`);
    }
  }
}

export function createReceiptAuditor(options = {}) {
  const logger = options.logger || console;
  const repoRoot = options.repoRoot || process.cwd();
  const gitRemote = options.gitRemote || null;
  const tmpBase = options.tmpBase || tmpdir();

  return {
    auditReceipt: (receipt, opts = {}) => auditReceipt(receipt, { ...options, logger, repoRoot, gitRemote, tmpBase, ...opts }),
    replaySample: (opts = {}) => replaySample({ ...options, logger, repoRoot, gitRemote, tmpBase, ...opts }),
  };
}

export async function auditReceipt(input, userOpts = {}) {
  const auditTimestamp = getNow();
  const isEnvelope = input && typeof input === 'object' && input.receipt;
  const opts = isEnvelope ? { ...input, ...userOpts } : userOpts;
  const logger = opts.logger || console;
  const repoRoot = opts.repoRoot || process.cwd();
  const gitRemote = opts.gitRemote || null;
  const tmpBase = opts.tmpBase || tmpdir();

  let receiptObj;
  let receiptPath = null;

  if (isEnvelope) {
    receiptObj = input.receipt;
  } else if (typeof input === 'string') {
    receiptPath = input;
    const read = await readReceipt(input, logger);
    if (read.error) {
      return {
        replay_verdict: VERDICT_UNREPRODUCIBLE,
        audit_completed: false,
        original_verdict: null,
        command: null,
        exit_code: null,
        stdout: '',
        stderr: `Failed to read receipt: ${read.error.message}`,
        checkout_path: null,
        git_sha: null,
        separation_of_duties: 'Receipt could not be read; no command executed.',
        audit_timestamp: auditTimestamp,
      };
    }
    receiptObj = read.parsed;
  } else {
    receiptObj = input;
  }

  const receipt = resolveReceiptInput(receiptObj);
  if (!receipt) {
    return {
      replay_verdict: VERDICT_UNREPRODUCIBLE,
      audit_completed: false,
      original_verdict: null,
      command: null,
      exit_code: null,
      stdout: '',
      stderr: 'Receipt is not a valid object.',
      checkout_path: null,
      git_sha: null,
      separation_of_duties: 'Receipt parsing failed; no command executed.',
      audit_timestamp: auditTimestamp,
    };
  }

  const gitSha = receipt.git_sha || receipt.commit_sha || null;
  const command = resolveCommand(receipt, opts);
  const originalVerdict = verdictFromReceipt(receipt.receipt_kind || receipt.kind || 'manual', receipt);
  const skipGitCheckout = Boolean(opts.skip_git_checkout || receipt.skip_git_checkout);

  if (!command) {
    return {
      replay_verdict: VERDICT_UNREPRODUCIBLE,
      audit_completed: false,
      original_verdict: originalVerdict,
      command: null,
      exit_code: null,
      stdout: '',
      stderr: 'No acceptance_command or verify_command found in receipt or options.',
      checkout_path: null,
      git_sha: gitSha,
      separation_of_duties: 'Missing command; no execution attempted.',
      audit_timestamp: auditTimestamp,
    };
  }

  let checkoutPath = repoRoot;
  let tempDir = null;
  let stdout = '';
  let stderr = '';
  let exitCode = null;
  let replayVerdict = VERDICT_UNREPRODUCIBLE;

  if (!skipGitCheckout && gitSha) {
    const checkout = await checkoutGitSha(gitSha, gitRemote, tmpBase, logger);
    if (checkout.error) {
      return {
        replay_verdict: VERDICT_UNREPRODUCIBLE,
        audit_completed: false,
        original_verdict: originalVerdict,
        command,
        exit_code: null,
        stdout: '',
        stderr: `Git checkout unavailable: ${checkout.error}`,
        checkout_path: null,
        git_sha: gitSha,
        separation_of_duties: 'Git checkout failed; no command executed.',
        audit_timestamp: auditTimestamp,
      };
    }
    checkoutPath = checkout.checkoutPath;
    tempDir = checkoutPath;
  }

  try {
    const result = await runCommand(command, checkoutPath, logger);
    stdout = result.stdout;
    stderr = result.stderr;
    exitCode = result.exitCode;
    if (exitCode === 0) {
      replayVerdict = VERDICT_PASS;
    } else if (exitCode !== null) {
      replayVerdict = VERDICT_FAIL;
    } else {
      replayVerdict = VERDICT_UNREPRODUCIBLE;
    }
  } catch (err) {
    stderr = `Command execution failed: ${err.message}`;
    replayVerdict = VERDICT_UNREPRODUCIBLE;
  } finally {
    if (tempDir) {
      await cleanupCheckout(tempDir, logger);
    }
  }

  return {
    replay_verdict: replayVerdict,
    audit_completed: true,
    original_verdict: originalVerdict,
    command,
    exit_code: exitCode,
    stdout,
    stderr,
    checkout_path: checkoutPath === repoRoot ? repoRoot : tempDir,
    git_sha: gitSha,
    separation_of_duties: 'Command was executed independently of the original receipt issuer.',
    audit_timestamp: auditTimestamp,
  };
}

export async function replaySample(options = {}) {
  const logger = options.logger || console;
  const repoRoot = options.repoRoot || process.cwd();
  const missionId = options.mission_id || DEFAULT_SAMPLE_MISSION;
  const missionPath = resolve(repoRoot, 'builderos-reboot/MISSIONS', missionId);
  const samplePath = join(missionPath, 'OBJECTIVE_VERDICT.json');

  if (!existsSync(samplePath)) {
    return {
      replay_verdict: VERDICT_UNREPRODUCIBLE,
      audit_completed: false,
      original_verdict: null,
      command: null,
      exit_code: null,
      stdout: '',
      stderr: `No OBJECTIVE_VERDICT.json found at ${samplePath}`,
      checkout_path: null,
      git_sha: null,
      separation_of_duties: 'Sample receipt not found; nothing to replay.',
      audit_timestamp: getNow(),
    };
  }

  logger.info(`Replaying sample receipt from: ${samplePath}`);
  return auditReceipt(samplePath, { ...options, skip_git_checkout: true });
}
