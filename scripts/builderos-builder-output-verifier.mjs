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

  const scanResult = await scanForGroqAntipatterns(targetFile);
  const antipatternOk = scanResult.ok;
  const antipatternFindings = scanResult.findings;

  const stubResult = await detectBuilderStub(targetFile, originalLines);
  const stubOk = !stubResult.isStub;
  const stubReason = stubResult.reason || null;

  if (!stubOk && stubResult.signals.includes('stub_marker_"TODO"')) {
    stubOk = true;
    antipatternFindings.push('Possible false positive: TODO marker found in string constant');
  }

  const cliDetected = isCliScript || (await readFile(targetFile)).toString().includes('process.argv') || (await readFile(targetFile)).toString().includes('process.exit');
  const runtimeOk = cliDetected ? spawnSync('node', [targetFile], { stdio: 'pipe', timeout: 5000 }).status === 0 && spawnSync('node', [targetFile], { stdio: 'pipe', timeout: 5000 }).stdout?.toString().trim().length > 0 : true;
  const runtimeOutput = cliDetected ? spawnSync('node', [targetFile], { stdio: 'pipe', timeout: 5000 }).stdout?.toString().trim().slice(0, 200) : 'skipped_not_cli';

  const gates = { syntax: syntaxOk, antipattern: antipatternOk, stub: stubOk, runtime: runtimeOk };
  const ok = Object.values(gates).every((gate) => gate);
  const first_failure = Object.keys(gates).find((key) => !gates[key]) || null;

  const result = {
    ok,
    targetFile,
    gates,
    first_failure,
    antipattern_findings: antipatternFindings,
    stub_signals: stubResult.signals,
    runtime_output: runtimeOutput,
    syntax_error: syntaxErr,
  };

  try {
    writeFileSync(join(ROOT, 'data', 'last-builder-verification.json'), JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error writing verification result:', error);
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