/**
 * SYNOPSIS: TSOS efficiency evaluation — proposals only; never mission authority.
 */
import { promptOptimizationProposal } from './prompt-optimization.js';
import { cacheValueEvaluation } from './cache-value-evaluator.js';
import { modelRoutingEvaluation } from './model-routing-evaluator.js';

/**
 * TSOS efficiency evaluation — proposals only; never mission authority.
 */
export function evaluateEfficiency({ stepMetrics, historical = [] } = {}) {
  const proposals = [];
  const tokenCost = Number(stepMetrics?.token_cost) || 0;
  const latency = Number(stepMetrics?.latency_ms) || 0;
  const waste = Boolean(stepMetrics?.waste);

  if (tokenCost > 5000) {
    proposals.push(
      promptOptimizationProposal({
        measured_upside: 'reduce_tokens_on_repeat_steps',
        drift_risk: 'low_if_spec_unchanged',
      }),
    );
  }

  if (historical.length >= 3) {
    const avgLatency = historical.reduce((s, h) => s + (h.latency_ms || 0), 0) / historical.length;
    if (latency > avgLatency * 1.5) {
      proposals.push(cacheValueEvaluation({ answer_class: 'stable_copy', stability_evidence: 'repeat_step', cache_recommendation: 'cache_content_source_sha' }));
    }
  }

  if (waste) {
    proposals.push(modelRoutingEvaluation({ current_tier: stepMetrics?.model_tier, proposed_tier: 'deterministic_copy', measured_upside: 'skip_model_on_waste_retry', review_required: true }));
  }

  return {
    measured: {
      token_cost: tokenCost,
      latency_ms: latency,
      waste,
    },
    proposals,
    authority_note: 'Proposals require human or SENTRY review — TSOS does not apply optimizations silently',
  };
}
