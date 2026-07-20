/**
 * SYNOPSIS: Exports routeFailure — services/self-repair-failure-router.js.
 */
import { queryRootCauseChains } from './self-repair-root-cause-chains.js';
import { hasFailedApproach } from './self-repair-negative-knowledge.js';

export async function routeFailure(pool, { failure_signature, target_path, approach_signature }) {
  const matched_negative_knowledge = await hasFailedApproach(pool, { target: target_path, approach_signature });
  if (matched_negative_knowledge) {
    return {
      action: 'AVOID_KNOWN_BAD',
      matched_negative_knowledge,
      matched_chains: [],
      confidence: Math.min(0.95, 0.5 + matched_negative_knowledge.times_seen * 0.1),
    };
  }

  const matched_chains = await queryRootCauseChains(pool, { bug_shape_signature: failure_signature });
  if (matched_chains.length > 0) {
    return {
      action: 'RETRY_KNOWN_FIX',
      matched_negative_knowledge: null,
      matched_chains,
      confidence: 0.6,
    };
  }

  return {
    action: 'NOVEL_INVESTIGATE',
    matched_negative_knowledge: null,
    matched_chains: [],
    confidence: 0,
  };
}
