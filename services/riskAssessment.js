/**
 * SYNOPSIS: Exports assessRisk — services/riskAssessment.js.
 */
export function assessRisk(riskFactors) {
  let riskLevel = 'low';

  if (riskFactors.includes('highImpact') && riskFactors.includes('highProbability')) {
    riskLevel = 'high';
  } else if (riskFactors.includes('highImpact') || riskFactors.includes('highProbability')) {
    riskLevel = 'medium';
  }

  return {
    riskLevel,
    recommendation: riskLevel === 'high' ? 'Immediate action required' : 'Monitor and review',
  };
}