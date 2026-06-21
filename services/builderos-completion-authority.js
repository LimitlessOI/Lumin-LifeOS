/**
 * SYNOPSIS: BuilderOS completion authority — single terminal completion grant for /builder/build.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { verifyGovernedOutcomeBeforePass } from './builder-outcome-verifier.js';

export const BUILDEROS_COMPLETION_AUTHORITY_FLAG = 'BUILDEROS_COMPLETION_AUTHORITY';

function normalizeText(value) {
  return String(value || '').trim();
}

function boolFromEnv(value, fallback = true) {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return fallback;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  return fallback;
}

function buildCompletionReceiptId(commitSha) {
  const sha = normalizeText(commitSha).slice(0, 12) || 'no_sha';
  return `ca_${Date.now()}_${sha}`;
}

export function isCompletionAuthorityEnabled(env = process.env) {
  return boolFromEnv(env?.[BUILDEROS_COMPLETION_AUTHORITY_FLAG], true);
}

export async function evaluateBuildCompletion({
  buildResult = {},
  founder_request = '',
  required_outcome = null,
  technical = { ok: true, source: 'builder_precommit' },
  readCommit,
  featureEnabled = isCompletionAuthorityEnabled(),
} = {}) {
  const committed = buildResult?.committed === true;
  const commitSha = normalizeText(buildResult?.commit_sha || buildResult?.sha || '');

  if (!buildResult?.ok || !committed) {
    return {
      granted: false,
      completion_required: false,
      blocker: null,
      reason: 'build_not_claiming_success',
      completion_receipt_id: null,
      rollback_bypass: false,
      warning: null,
      outcome_verification: null,
      technical_verification: technical || null,
    };
  }

  if (!featureEnabled) {
    return {
      granted: true,
      completion_required: true,
      blocker: null,
      reason: 'completion_authority_flag_off',
      completion_receipt_id: null,
      rollback_bypass: true,
      warning: `${BUILDEROS_COMPLETION_AUTHORITY_FLAG}=0`,
      outcome_verification: null,
      technical_verification: technical || null,
    };
  }

  if (technical?.ok !== true) {
    return {
      granted: false,
      completion_required: true,
      blocker: 'FAIL_INCOMPLETE_TECHNICAL',
      reason: 'technical_verification_failed',
      completion_receipt_id: null,
      rollback_bypass: false,
      warning: null,
      outcome_verification: null,
      technical_verification: technical || null,
    };
  }

  if (!commitSha || !normalizeText(founder_request)) {
    return {
      granted: false,
      completion_required: true,
      blocker: 'FAIL_MISSING_EVIDENCE',
      reason: !commitSha ? 'missing_commit_sha' : 'missing_founder_request',
      completion_receipt_id: null,
      rollback_bypass: false,
      warning: null,
      outcome_verification: null,
      technical_verification: technical || null,
    };
  }

  const outcome = await verifyGovernedOutcomeBeforePass({
    job: {
      instruction: founder_request,
      metadata_json: required_outcome ? { required_outcome } : {},
    },
    trace: {
      builder_output: {
        commit_sha: commitSha,
      },
    },
    verifierResult: { ok: true },
    ...(typeof readCommit === 'function' ? { readCommit } : {}),
  });

  if (!outcome?.ok) {
    return {
      granted: false,
      completion_required: true,
      blocker: outcome?.code || 'FAIL_WRONG_OUTCOME',
      reason: outcome?.reason || 'requested_outcome_missing_in_commit',
      completion_receipt_id: null,
      rollback_bypass: false,
      warning: null,
      outcome_verification: outcome || null,
      technical_verification: technical || null,
    };
  }

  return {
    granted: true,
    completion_required: true,
    blocker: null,
    reason: 'completion_granted',
    completion_receipt_id: buildCompletionReceiptId(commitSha),
    rollback_bypass: false,
    warning: null,
    outcome_verification: outcome,
    technical_verification: technical || null,
  };
}

export async function grantBuildCompletion(params = {}) {
  return evaluateBuildCompletion(params);
}

