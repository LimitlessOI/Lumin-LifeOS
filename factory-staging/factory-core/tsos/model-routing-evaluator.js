/**
 * SYNOPSIS: Exports modelRoutingEvaluation — factory-staging/factory-core/tsos/model-routing-evaluator.js.
 */
export function modelRoutingEvaluation(entry) {
  return {
    current_tier: entry.current_tier,
    proposed_tier: entry.proposed_tier,
    measured_upside: entry.measured_upside,
    review_required: true
  };
}
