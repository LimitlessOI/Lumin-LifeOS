export function modelRoutingEvaluation(entry) {
  return {
    current_tier: entry.current_tier,
    proposed_tier: entry.proposed_tier,
    measured_upside: entry.measured_upside,
    review_required: true
  };
}
