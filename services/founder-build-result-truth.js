/**
 * SYNOPSIS: Normalize async founder build results into explicit execution-truth fields.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateBuildProof } from './build-proof-contract.js';
import {
  assertFounderBuildBaseUrl,
  fetchDeployCommitSha,
  fetchLiveOverlayHtml,
  resolveFounderBuildBaseUrl,
} from './founder-build-success-gate.js';
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

function normalizeShortSha(sha) {
  return String(sha || '').trim().slice(0, 12);
}

function shasMatch(a, b) {
  const left = normalizeShortSha(a);
  const right = normalizeShortSha(b);
  return Boolean(left && right && (left.startsWith(right.slice(0, 7)) || right.startsWith(left.slice(0, 7))));
}

function extractHtmlCommentProbe(task) {
  const match = String(task || '').match(/<!--\s*([^>]+?)\s*-->/);
  return match ? `<!-- ${match[1].trim()} -->` : null;
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

export async function refreshFounderBuildResultTruth(result = {}, {
  task = '',
  baseUrl = resolveFounderBuildBaseUrl(),
  commandKey = '',
  fetchDeployCommitShaImpl = fetchDeployCommitSha,
  fetchLiveOverlayHtmlImpl = fetchLiveOverlayHtml,
} = {}) {
  const normalized = hydrateFounderBuildResultTruth(result, task);
  if (!normalized || typeof normalized !== 'object') return normalized;
  if (normalized.pass_fail !== 'PASS' || normalized.committed !== true) return normalized;

  const currentTransport = String(normalized.transport_status || '');
  if (!/COMMIT_ONLY_NOT_LIVE|ORIGIN_MAIN_NOT_UPDATED|DEPLOY_NOT_SYNCED|LIVE_BEHAVIOR_NOT_VERIFIED/i.test(currentTransport)) {
    return normalized;
  }

  const commitSha = normalized.sha || normalized.commit_sha || null;
  if (!commitSha) return normalized;

  const baseCheck = assertFounderBuildBaseUrl(baseUrl);
  if (!baseCheck.ok) return normalized;

  const deploySha = await fetchDeployCommitShaImpl(baseCheck.baseUrl, commandKey).catch(() => null);
  const deployMatches = shasMatch(commitSha, deploySha);
  const targetFile = String(normalized.target_file || '');
  const commentProbe = extractHtmlCommentProbe(task);

  let runtimeBehaviorVerified = null;
  if (deployMatches && commentProbe && /^public\/overlay\/.+\.html$/i.test(targetFile)) {
    const live = await fetchLiveOverlayHtmlImpl(baseCheck.baseUrl, targetFile).catch(() => ({ ok: false }));
    if (live?.ok) {
      runtimeBehaviorVerified = String(live.text || '').includes(commentProbe);
    }
  }

  const founderVerificationRequired = normalized.founder_verification_required === true;
  const proof = evaluateBuildProof({
    codeChanging: true,
    commitSha,
    originContainsCommit: deployMatches ? true : normalized.origin_contains_commit ?? null,
    deployRequired: founderVerificationRequired,
    deployMatchesOriginMain: founderVerificationRequired ? (deployMatches ? true : null) : null,
    runtimeBehaviorVerified,
  });

  const founderVerification = runtimeBehaviorVerified === true
    ? {
      ...(normalized.founder_verification || {}),
      ok: true,
      code: 'LIVE_MARKER_VERIFIED',
      deploy_synced: deployMatches,
      deploy_sha: deploySha || null,
      probe_type: 'html_comment',
      probe_value: commentProbe,
      surface: targetFile,
    }
    : normalized.founder_verification || null;

  return {
    ...normalized,
    origin_contains_commit: deployMatches ? true : normalized.origin_contains_commit ?? null,
    transport_status: proof.transport_status || normalized.transport_status || null,
    founder_verification: founderVerification,
  };
}
