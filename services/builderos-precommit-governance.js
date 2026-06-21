/**
 * SYNOPSIS: BuilderOS pre-commit governance wrapper.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * @ssot docs/projects/builderos-remediation/BLUEPRINT.md
 */

import { spawnSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runBuildPipeline } from './builderos-build-pipeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const VERIFIER_SCRIPT = join(ROOT, 'scripts', 'builderos-builder-output-verifier.mjs');

function runUnifiedVerifierOnContent(content, originalLines = null) {
  const tempPath = join(tmpdir(), `builderos-precommit-${Date.now()}.mjs`);
  try {
    writeFileSync(tempPath, content, 'utf8');
    const args = [VERIFIER_SCRIPT, tempPath];
    if (originalLines !== null && originalLines !== undefined) {
      args.push(String(originalLines));
    }
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
  const pipelineResult = await runBuildPipeline(opts);
  const finalOutput = pipelineResult.retryOutput || opts.generatedOutput;

  if (!pipelineResult.ok) {
    return {
      decision: pipelineResult.retryAttempted ? 'block_commit' : 'retry_once',
      shouldCommit: false,
      pipeline: pipelineResult,
      verifier: null,
      finalOutput: null,
    };
  }

  const verifier = runUnifiedVerifierOnContent(finalOutput, opts.originalLines ?? null);
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
