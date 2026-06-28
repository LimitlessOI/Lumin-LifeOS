/**
 * SYNOPSIS: Normalize async founder build results into explicit execution-truth fields.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceExecutionTruth } from './lifeos-execution-truth.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runGit(args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function detectOriginContainsCommit(sha) {
  const commitSha = String(sha || '').trim();
  if (!commitSha) return null;
  runGit(['fetch', 'origin', 'main']);
  const res = runGit(['merge-base', '--is-ancestor', commitSha, 'origin/main']);
  if (res.status === 0) return true;
  if (res.status === 1) return false;
  return null;
}

export function hydrateFounderBuildResultTruth(result = {}, task = '') {
  if (!result || typeof result !== 'object') return result;
  if (result.pass_fail !== 'PASS' || result.committed !== true) return result;
  if (result.transport_status) return result;

  const needsTruth = !result.command_truth
    || !result.receipt_truth
    || !result.human_summary
    || !result.transport_status;
  if (!needsTruth) return result;

  const commitSha = result.sha || result.commit_sha || null;
  const normalized = enforceExecutionTruth({
    ...result,
    ok: result.ok !== false,
    sha: commitSha,
    origin_contains_commit: detectOriginContainsCommit(commitSha),
    execution_path: result.execution_path || 'builder_task_execute',
  }, { action: 'build', task });

  return {
    ...result,
    ...normalized,
    human_summary: result.human_summary || normalized.human_summary,
  };
}
