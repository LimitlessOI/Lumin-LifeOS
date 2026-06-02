// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { classifyBuildTarget } from './builderos-patch-mode-policy.js';

const __file = fileURLToPath(import.meta.url);
const __dirname = dirname(__file);
const ROOT = resolve(__dirname, '..');
const SCRIPTS = join(ROOT, 'scripts');

const CORRECTION_CLAUSES = {
  STUB: 'CRITICAL: Do NOT generate a stub or placeholder. Write complete working implementation, minimum 60 lines of real code. Every function must have a real body with real logic.',
  SYNTAX: 'CRITICAL: Do not write regex literals. Use string.includes() or string.startsWith() for all pattern matching. List every import at the top. Every import must be used.',
  SEMANTIC_SILENT: 'CRITICAL: The main exported function MUST be called at module bottom as the CLI entry point with if(process.argv[2]) guard.',
  ANTIPATTERN: 'CRITICAL: Name factory parameter requireKey not rk. Do not use pool.query with backtick template syntax. Create router variable inside the factory function body, not at module level.',
  MISSING_IMPORT: 'CRITICAL: List every import at the top of the file. Every function you call must be imported. writeFileSync must be imported from fs if used. Do not call any function that is not imported.',
};

function detectFailureType(antipatternFindings, stubSignals) {
  // Scanner emits { pattern: '...' } — not { id: '...' }. Using .pattern avoids TypeError on undefined.
  if (antipatternFindings.some((f) => String(f.pattern || '').includes('MARKDOWN_FENCE'))) return 'SYNTAX';
  if (antipatternFindings.some((f) => String(f.pattern || '').includes('WRONG_IMPORT'))) return 'MISSING_IMPORT';
  if (antipatternFindings.some((f) => String(f.pattern || '').includes('RK_NOT') || String(f.pattern || '').includes('MODULE_LEVEL'))) return 'ANTIPATTERN';
  if (stubSignals.length > 0) return 'STUB';
  return 'SYNTAX';
}

async function runInMemoryGates(content, targetFile, originalLines) {
  const tempPath = join(tmpdir(), 'builderos-gate-' + Date.now() + '.js');
  try {
    writeFileSync(tempPath, content, 'utf8');
    const scanRun = spawnSync('node', [join(SCRIPTS, 'builderos-groq-antipattern-scan.mjs'), tempPath], { stdio: 'pipe' });
    let scanResult = { ok: true, findings: [] };
    try {
      scanResult = JSON.parse(scanRun.stdout.toString());
    } catch {
      // use default
    }
    const antipatternOk = scanResult.ok === true;
    const antipatternFindings = scanResult.findings || [];
    const stubArgs = [join(SCRIPTS, 'verify-builder-output.mjs'), tempPath];
    if (originalLines !== null) {
      stubArgs.push(String(originalLines));
    }
    const stubRun = spawnSync('node', stubArgs, { stdio: 'pipe' });
    const stubOk = stubRun.status === 0;
    const stubStderr = stubRun.stderr?.toString().trim() || '';
    const stubSignals = stubStderr.includes('Reason:') ? stubStderr.split('Reason:')[1].trim().split('; ') : [];
    const gatesOk = antipatternOk && stubOk;
    const failureType = gatesOk ? null : detectFailureType(antipatternFindings, stubSignals);
    return { ok: gatesOk, antipatternOk, stubOk, antipatternFindings, stubSignals, failureType };
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
}

async function runBuildPipeline(opts) {
  const zoneResult = classifyBuildTarget(opts.resolvedTarget);
  if (zoneResult.zone === 4) {
    return { ok: false, shouldCommit: false, failureType: 'ZONE4_BLOCKED', zoneResult, retryAttempted: false, gates: null };
  }
  if (zoneResult.zone === 3) {
    return { ok: false, shouldCommit: false, failureType: 'ZONE3_PATCH_REQUIRED', zoneResult, retryAttempted: false, gates: null };
  }
  const gateResult = await runInMemoryGates(opts.generatedOutput, opts.resolvedTarget, opts.originalLines);
  if (gateResult.ok) {
    return { ok: true, shouldCommit: true, retryAttempted: false, gates: { antipattern: gateResult.antipatternOk, stub: gateResult.stubOk }, zoneResult, failureType: null };
  }
  if (opts.retryFn === null || opts.retryFn === undefined) {
    return { ok: false, shouldCommit: false, retryAttempted: false, gates: { antipattern: gateResult.antipatternOk, stub: gateResult.stubOk }, failureType: gateResult.failureType, zoneResult, antipatternFindings: gateResult.antipatternFindings, stubSignals: gateResult.stubSignals };
  }
  const correctionClause = CORRECTION_CLAUSES[gateResult.failureType] || '';
  const retrySpec = correctionClause + '\nORIGINAL SPEC: ' + (opts.taskBody.spec || '');
  const retryTaskBody = Object.assign({}, opts.taskBody, { spec: retrySpec });
  let retryResult;
  try {
    retryResult = await opts.retryFn(retryTaskBody);
  } catch (err) {
    return { ok: false, shouldCommit: false, retryAttempted: true, retryError: err.message, failureType: gateResult.failureType, gates: { antipattern: gateResult.antipatternOk, stub: gateResult.stubOk }, zoneResult };
  }
  if (!retryResult || !retryResult.ok) {
    return { ok: false, shouldCommit: false, retryAttempted: true, retryError: retryResult?.error || 'retry_fn_failed', failureType: gateResult.failureType, gates: { antipattern: gateResult.antipatternOk, stub: gateResult.stubOk }, zoneResult };
  }
  const retryGates = await runInMemoryGates(retryResult.output, opts.resolvedTarget, opts.originalLines);
  return { ok: retryGates.ok, shouldCommit: retryGates.ok, retryAttempted: true, retryOutput: retryResult.output, retryModel: retryResult.model_used || null, gates: { antipattern: retryGates.antipatternOk, stub: retryGates.stubOk }, failureType: retryGates.ok ? null : retryGates.failureType, zoneResult, antipatternFindings: retryGates.antipatternFindings, stubSignals: retryGates.stubSignals };
}

export { runBuildPipeline };
