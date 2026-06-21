/**
 * SYNOPSIS: Full SENTRY review artifact shape for receipts and C2 surfaces.
 */
import { verifyStepContract } from './verify-step-contract.js';
import { antiPatternCheck } from './anti-pattern-check.js';
import { futureLookbackReview } from './future-lookback.js';
import { unintendedConsequenceCheck } from './unintended-consequence-check.js';
import { checkProofFreshness } from './proof-freshness.js';

export function verifyStepResult(step, builderResult, context = {}) {
  const contract = context.contract
    || verifyStepContract({
      mission_id: context.mission_id,
      step,
      builderResult,
    });

  const antiPattern = antiPatternCheck({ step, builderResult });
  const future = futureLookbackReview({ step, builderResult });
  const unintended = unintendedConsequenceCheck({ step, builderResult });
  const freshness = checkProofFreshness(context.mission_id);

  const blocking = [];
  if (!contract.pass) blocking.push('acceptance_contract');
  if (!antiPattern.pass) blocking.push('anti_pattern');
  if (!future.pass) blocking.push('future_lookback');
  if (!unintended.pass) blocking.push('unintended_consequence');
  if (!freshness.pass) blocking.push('proof_freshness');

  const pass = blocking.length === 0 && builderResult.status === 'DONE';

  return {
    implementation_status: pass ? 'PASS' : 'FAIL',
    stepId: step.step_id,
    resultStatus: builderResult.status,
    verifyAgainst: ['acceptance_tests', 'exact_output_contract', 'anti_pattern_check', 'future_lookback', 'proof_freshness'],
    contract,
    anti_pattern: antiPattern,
    future_lookback: future,
    unintended_consequence: unintended,
    proof_freshness: freshness,
    blocking_findings: blocking,
    pass,
  };
}

/**
 * Full SENTRY review artifact shape for receipts and C2 surfaces.
 */
export function buildSentryReview({ mission_id, step, builderResult, contract, verify }) {
  const blocking = [
    ...(verify.blocking_findings || []),
    ...(contract.failures || []).map((f) => f.reason),
  ];

  return {
    recorded_at: new Date().toISOString(),
    mission_id,
    step_id: step?.step_id,
    blueprint_status: 'FROZEN',
    implementation_status: verify.pass ? 'PASS' : 'FAIL',
    blocking_findings: blocking,
    future_horizon_findings: verify.future_lookback?.findings || [],
    unintended_consequence_findings: verify.unintended_consequence?.findings || [],
    recommended_preventions: blocking.length
      ? ['return_to_bpb', 'refresh_hash_pins', 'fix_sandbox_or_contract']
      : [],
    recommended_improvements: verify.future_lookback?.findings?.map((f) => f.note).filter(Boolean) || [],
  };
}
