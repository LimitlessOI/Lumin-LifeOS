// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import { spawnSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { scanForGroqAntipatterns } from './builderos-groq-antipattern-scan.mjs';
import { detectBuilderStub } from './verify-builder-output.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '../..');

export async function runVerification(targetFile, opts = {}) {
  const originalLines = opts.originalLines ?? null;
  const isCliScript = opts.isCliScript ?? null;

  if (!existsSync(targetFile)) {
    return {
      ok: false,
      gates: { syntax: false, antipattern: false, stub: false, runtime: false },
      first_failure: 'file_not_found',
      findings: [],
    };
  }

  const syntaxOk = spawnSync('node', ['--check', targetFile], { stdio: 'pipe' }).status === 0;
  const syntaxErr = spawnSync('node', ['--check', targetFile], { stdio: 'pipe' }).stderr?.toString().trim() || '';

  if (!syntaxOk) {
    return {
      ok: false,
      gates: { syntax: false, antipattern: false, stub: false, runtime: false },
      first_failure: 'syntax_error',
      findings: [syntaxErr],
    };
  }

  const antipatternOk = await scanForGroqAntipatterns(targetFile);
  const antipatternFindings = antipatternOk.findings;

  const stubOk = await detectBuilderStub(targetFile, originalLines);
  const stubReason = stubOk.reason || null;

  if (!stubOk.isStub && stubOk.signals.includes('stub_marker_"TODO"')) {
    stubOk.isStub = true;
    stubOk.reason = 'likely false positive';
  }

  const cliDetected = isCliScript || (await readFile(targetFile)).toString().slice(-20).includes('process.argv') || (await readFile(targetFile)).toString().slice(-20).includes('process.exit');

  let runtimeOk;
  let runtimeOutput;
  let runtimeResult;

  if (cliDetected) {
    runtimeResult = spawnSync('node', [targetFile], { stdio: 'pipe', timeout: 5000 });
    runtimeOk = runtimeResult.status === 0 && runtimeResult.stdout?.toString().trim().length > 0;
    runtimeOutput = runtimeResult.stdout?.toString().trim().slice(0, 200);
  } else {
    runtimeOk = true;
    runtimeOutput = 'skipped_not_cli';
  }

  const gates = {
    syntax: syntaxOk,
    antipattern: antipatternOk,
    stub: stubOk,
    runtime: runtimeOk,
  };

  const ok = Object.values(gates).every((gate) => gate);
  const first_failure = Object.keys(gates).find((key) => !gates[key]) || null;

  const result = {
    ok,
    targetFile,
    gates,
    first_failure,
    antipattern_findings: antipatternFindings,
    stub_signals: stubOk.signals,
    runtime_output: runtimeOutput,
    syntax_error: syntaxErr,
  };

  try {
    writeFileSync(join(ROOT, 'data', 'last-builder-verification.json'), JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  }

  return result;
}

if (process.argv[2]) {
  runVerification(process.argv[2]).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  });
}

// ---METADATA---
// {
//   "target_file": null,
//   "insert_after_line": null,
//   "confidence": 1
// }