export function promptOptimizationProposal(entry) {
  return {
    proposal_type: 'prompt_optimization',
    measured_upside: entry.measured_upside,
    drift_risk: entry.drift_risk,
    requires_review: true
  };
}
