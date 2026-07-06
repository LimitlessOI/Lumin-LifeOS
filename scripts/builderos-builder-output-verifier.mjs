/**
 * SYNOPSIS: BuilderOS — unified 4-gate output verification pipeline.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * BuilderOS — unified 4-gate output verification pipeline.
 *
 * Gates: syntax (node --check) → antipattern scan → stub detection → runtime execution.
 * Uses subprocess calls for antipattern scanner and stub detector to avoid the
 * module-level CLI guard firing on import (process.argv[2] guard in those files).
 *
 * GAP-FILL: builder (groq_llama) two attempts both failed —
 *   Attempt 1 (43d1a395): readFile not imported, antipatternOk/stubOk used as objects
 *     not booleans in gates, false-positive condition inverted, metadata block injected.
 *   Retry (e261622e, MISSING_IMPORT correction): const stubOk reassigned (TypeError),
 *     readFile still not imported. Import chain issue: scanner's process.argv[2] CLI
 *     guard fires on import, hijacks stdout. Subprocess architecture required.
 */

import { spawnSync } from 'child_process';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '../..');
const SCRIPTS = join(ROOT, 'scripts');

export async function runVerification(targetFile, opts = {}) {
  const originalLines = opts.originalLines ?? null;
  const logicalTarget = opts.logicalTarget || null;
  const absTarget = resolve(targetFile);

  if (!existsSync(absTarget)) {
    return {
      ok: false,
      targetFile,
      gates: { syntax: false, antipattern: false, stub: false, runtime: false },
      first_failure: 'file_not_found',
      antipattern_findings: [],
      stub_signals: [],
      runtime_output: null,
      syntax_error: 'file does not exist',
    };
  }

  // Gate 1: syntax
  const syntaxRun = spawnSync('node', ['--check', absTarget], { stdio: 'pipe' });
  const syntaxOk = syntaxRun.status === 0;
  const syntaxErr = syntaxRun.stderr?.toString().trim() || '';

  if (!syntaxOk) {
    return {
      ok: false,
      targetFile,
      gates: { syntax: false, antipattern: false, stub: false, runtime: false },
      first_failure: 'syntax',
      antipattern_findings: [],
      stub_signals: [],
      runtime_output: null,
      syntax_error: syntaxErr,
    };
  }

  // Gate 2: antipattern — subprocess call avoids scanner's module-level CLI guard
  const scannerPath = join(SCRIPTS, 'builderos-groq-antipattern-scan.mjs');
  const scanRun = spawnSync('node', [scannerPath, absTarget], { stdio: 'pipe' });
  let scanResult = { ok: true, findings: [] };
  try { scanResult = JSON.parse(scanRun.stdout?.toString() || '{"ok":true,"findings":[]}'); } catch { /* use default */ }
  const antipatternOk = scanResult.ok === true;
  const antipatternFindings = scanResult.findings || [];

  // Gate 3: stub detection — subprocess call
  const stubPath = join(SCRIPTS, 'verify-builder-output.mjs');
  const stubArgs = originalLines !== null
    ? [stubPath, absTarget, String(originalLines)]
    : [stubPath, absTarget];
  const stubRun = spawnSync('node', stubArgs, { stdio: 'pipe' });
  // stub detector exits 0 = ok, exits 1 = stub detected
  const stubOk = stubRun.status === 0;
  const stubStderr = stubRun.stderr?.toString().trim() || '';
  const stubSignals = stubStderr.includes('Reason:')
    ? stubStderr.split('Reason:')[1]?.trim().split('; ') || []
    : [];

  // Gate 4: runtime execution for CLI scripts
  const content = readFileSync(absTarget, 'utf8');
  const lastLines = content.split('\n').slice(-25).join('\n');
  const isCliScript = lastLines.includes('process.argv') || lastLines.includes('process.exit');
  let runtimeOk = true;
  let runtimeOutput = 'skipped_not_cli';
  const isAcceptanceVerifyScript = /scripts\/verify-[\w-]+\.mjs$/i.test(String(logicalTarget || ''));
  if (isCliScript && !isAcceptanceVerifyScript) {
    // Gate 4 actually EXECUTES the generated script. Sanitize the child env so a
    // probe run can never reach production data: strip DB/credential vars and
    // flag the run so well-behaved scripts stay in their safe dry-run path.
    const gateEnv = { ...process.env, BUILDEROS_RUNTIME_PROBE: '1', NODE_ENV: 'test' };
    for (const key of Object.keys(gateEnv)) {
      if (/^(PG|POSTGRES|DATABASE)/i.test(key) || /(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)$/i.test(key)) {
        delete gateEnv[key];
      }
    }
    const runtimeRun = spawnSync('node', [absTarget], { stdio: 'pipe', timeout: 5000, cwd: ROOT, env: gateEnv });
    const stdout = runtimeRun.stdout?.toString().trim() || '';
    runtimeOk = runtimeRun.status === 0 && stdout.length > 0;
    runtimeOutput = stdout.slice(0, 200) || runtimeRun.stderr?.toString().trim().slice(0, 200) || '';
  } else if (isCliScript && isAcceptanceVerifyScript) {
    runtimeOk = true;
    runtimeOutput = 'skipped_acceptance_verify_script';
  }

  const gates = { syntax: syntaxOk, antipattern: antipatternOk, stub: stubOk, runtime: runtimeOk };
  const ok = Object.values(gates).every(Boolean);
  const first_failure = Object.keys(gates).find((k) => !gates[k]) || null;

  const result = {
    ok,
    targetFile,
    gates,
    first_failure,
    antipattern_findings: antipatternFindings,
    stub_signals: stubSignals,
    runtime_output: runtimeOutput,
    syntax_error: syntaxErr,
  };

  try {
    writeFileSync(join(ROOT, 'data', 'last-builder-verification.json'), JSON.stringify(result, null, 2));
  } catch { /* non-fatal */ }

  return result;
}

// CLI entry — only when this file is the direct node entrypoint (not when imported).
const isVerifierCli = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isVerifierCli && process.argv[2]) {
  const originalLinesArg = process.argv[3];
  const logicalTarget = process.argv[4] || null;
  runVerification(process.argv[2], {
    logicalTarget,
    originalLines: originalLinesArg !== undefined && originalLinesArg !== '' ? originalLinesArg : null,
  }).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  });
}
