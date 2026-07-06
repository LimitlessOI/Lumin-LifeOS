/**
 * SYNOPSIS: BuilderOS pre-commit governance wrapper.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * @ssot docs/projects/builderos-remediation/BLUEPRINT.md
 */

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runBuildPipeline } from './builderos-build-pipeline.js';
import { normalizeBuilderCodegenOutput } from './builderos-codegen-normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const VERIFIER_SCRIPT = join(ROOT, 'scripts', 'builderos-builder-output-verifier.mjs');
// Verify generated code from INSIDE the repo tree (node_modules/.cache) rather
// than the OS temp dir: ESM bare-specifier resolution walks up from the file's
// own location, so a /tmp file can never resolve real deps like `pg`. Writing
// under the repo lets the runtime gate actually run dependency-using scripts.
const VERIFY_TMP_DIR = join(ROOT, 'node_modules', '.cache', 'builderos-precommit');

function runUnifiedVerifierOnContent(content, originalLines = null, resolvedTarget = null) {
  const tempPath = join(VERIFY_TMP_DIR, `builderos-precommit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mjs`);
  try {
    mkdirSync(VERIFY_TMP_DIR, { recursive: true });
    writeFileSync(tempPath, content, 'utf8');
    const args = [VERIFIER_SCRIPT, tempPath, originalLines !== null && originalLines !== undefined ? String(originalLines) : ''];
    if (resolvedTarget) args.push(resolvedTarget);
    const run = spawnSync('node', args, { stdio: 'pipe' });
    let body = null;
    try {
      body = JSON.parse(run.stdout?.toString() || '{}');
    } catch {
      body = null;
    }
    return {
      ok: run.status === 0,
      status: run.status,
      stdout: run.stdout?.toString().trim() || '',
      stderr: run.stderr?.toString().trim() || '',
      tempPath,
      body,
    };
  } finally {
    if (existsSync(tempPath)) unlinkSync(tempPath);
  }
}

async function runPrecommitGovernance(opts) {
  const normalizedInput = normalizeBuilderCodegenOutput(opts.generatedOutput || '');
  const pipelineResult = await runBuildPipeline({ ...opts, generatedOutput: normalizedInput });
  let finalOutput = pipelineResult.retryOutput
    ? normalizeBuilderCodegenOutput(pipelineResult.retryOutput)
    : normalizedInput;

  if (!pipelineResult.ok) {
    return {
      decision: pipelineResult.retryAttempted ? 'block_commit' : 'retry_once',
      shouldCommit: false,
      pipeline: pipelineResult,
      verifier: null,
      finalOutput: null,
    };
  }

  const verifier = runUnifiedVerifierOnContent(finalOutput, opts.originalLines ?? null, opts.resolvedTarget ?? null);
  if (!verifier.ok && opts.retryFn && verifier.body?.first_failure === 'syntax') {
    const retrySpec = [
      'CRITICAL: Complete syntactically valid file — no truncation, no partial paste from reference files.',
      'List every import at the top. Every function must have a closing brace.',
      opts.taskBody?.spec || '',
    ].join('\n');
    let syntaxRetry;
    try {
      syntaxRetry = await opts.retryFn({ ...opts.taskBody, spec: retrySpec, max_output_tokens: 16384 });
    } catch {
      syntaxRetry = null;
    }
    if (syntaxRetry?.ok && syntaxRetry.output) {
      finalOutput = normalizeBuilderCodegenOutput(syntaxRetry.output);
      const retryVerifier = runUnifiedVerifierOnContent(finalOutput, opts.originalLines ?? null, opts.resolvedTarget ?? null);
      if (retryVerifier.ok) {
        return {
          decision: 'allow_commit',
          shouldCommit: true,
          pipeline: pipelineResult,
          verifier: retryVerifier,
          finalOutput,
          syntax_retry: true,
        };
      }
      return {
        decision: 'block_commit',
        shouldCommit: false,
        pipeline: pipelineResult,
        verifier: retryVerifier,
        finalOutput,
        syntax_retry: true,
      };
    }
  }
  if (!verifier.ok) {
    return {
      decision: 'block_commit',
      shouldCommit: false,
      pipeline: pipelineResult,
      verifier,
      finalOutput,
    };
  }

  return {
    decision: 'allow_commit',
    shouldCommit: true,
    pipeline: pipelineResult,
    verifier,
    finalOutput,
  };
}

export {
  runPrecommitGovernance,
  runUnifiedVerifierOnContent,
};
