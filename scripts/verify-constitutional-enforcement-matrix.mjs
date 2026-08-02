/**
 * SYNOPSIS: Verifies every entry in the Constitutional Enforcement Matrix.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * Verifies every entry in the Constitutional Enforcement Matrix.
 *
 * Reads data/constitutional-framework/proposals/ENFORCEMENT_MATRIX_PROPOSED.json
 * (or the canonical ENFORCEMENT_MATRIX.json if present), runs each unique verifier
 * once, applies the result to all laws that share it, and writes a JSON report.
 * Exit code 0 only if every verifiable entry passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const REPO_ROOT = process.cwd();
const PROPOSED_MATRIX = path.join(REPO_ROOT, 'data', 'constitutional-framework', 'proposals', 'ENFORCEMENT_MATRIX_PROPOSED.json');
const CANONICAL_MATRIX = path.join(REPO_ROOT, 'data', 'constitutional-framework', 'ENFORCEMENT_MATRIX.json');
const REPORT_DIR = path.join(REPO_ROOT, 'data', 'constitutional-framework', 'reports');
const REPORT_PATH = path.join(REPORT_DIR, 'ENFORCEMENT_MATRIX_REPORT.json');

const SOURCE = fs.existsSync(CANONICAL_MATRIX) ? CANONICAL_MATRIX : PROPOSED_MATRIX;
const MATRIX_STATUS = fs.existsSync(CANONICAL_MATRIX) ? 'CANONICAL' : 'PROPOSED';

function now() {
  return new Date().toISOString();
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function runCommand(cmdStr, cwd, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const parts = cmdStr.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    const start = Date.now();
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      resolve({ code, stdout, stderr, durationMs });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${err.message}`, durationMs: Date.now() - start });
    });
  });
}

async function main() {
  const matrix = readJson(SOURCE);
  if (!matrix || !Array.isArray(matrix.entries)) {
    console.error(`ENFORCEMENT_MATRIX_VERIFY: FAIL — could not read ${SOURCE}`);
    process.exit(1);
  }

  // Group entries by verifier command, run each unique verifier once.
  const verifierBuckets = new Map();
  const manualEntries = [];

  for (const entry of matrix.entries) {
    const cmd = entry.verifier_script;
    const isManual = !cmd || cmd === 'manual-review' || entry.verification_kind === 'manual';
    if (isManual) {
      manualEntries.push(entry);
      continue;
    }
    if (!verifierBuckets.has(cmd)) verifierBuckets.set(cmd, []);
    verifierBuckets.get(cmd).push(entry);
  }

  const verifierResults = new Map();
  for (const [cmd, entries] of verifierBuckets) {
    console.log(`VERIFY ${entries.length} law(s) → ${cmd}`);
    const result = await runCommand(cmd, REPO_ROOT);
    verifierResults.set(cmd, result);
  }

  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of matrix.entries) {
    const cmd = entry.verifier_script;
    const isManual = !cmd || cmd === 'manual-review' || entry.verification_kind === 'manual';
    if (isManual) {
      results.push({
        law_id: entry.law_id,
        title: entry.title,
        verifier: cmd || 'manual-review',
        status: 'manual',
        duration_ms: 0,
        stdout: '',
        stderr: '',
      });
      skipped += 1;
      continue;
    }

    const { code, stdout, stderr, durationMs } = verifierResults.get(cmd);
    const ok = code === 0;
    if (ok) passed += 1; else failed += 1;
    results.push({
      law_id: entry.law_id,
      title: entry.title,
      verifier: cmd,
      status: ok ? 'pass' : 'fail',
      exit_code: code,
      duration_ms: durationMs,
      stdout: stdout.slice(-2000),
      stderr: stderr.slice(-2000),
    });
  }

  const report = {
    schema: 'enforcement_matrix_report_v0',
    source: SOURCE,
    matrix_status: MATRIX_STATUS,
    generated_at: now(),
    generated_by: 'scripts/verify-constitutional-enforcement-matrix.mjs',
    summary: {
      total: matrix.entries.length,
      pass: passed,
      fail: failed,
      manual: skipped,
    },
    verifier_runs: Object.fromEntries(
      Array.from(verifierResults.entries()).map(([cmd, r]) => [cmd, { exit_code: r.code, duration_ms: r.durationMs }])
    ),
    entries: results,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  const verdict = failed === 0 ? 'PASS' : 'FAIL';
  console.log(`\nENFORCEMENT_MATRIX_VERIFY: ${verdict}`);
  console.log(`  total: ${report.summary.total}`);
  console.log(`  pass:  ${report.summary.pass}`);
  console.log(`  fail:  ${report.summary.fail}`);
  console.log(`  manual: ${report.summary.manual}`);
  console.log(`  report: ${REPORT_PATH}`);

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('ENFORCEMENT_MATRIX_VERIFY: ERROR', err.message);
  process.exit(1);
});
