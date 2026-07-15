/**
 * SYNOPSIS: Exports getDecisionDebt — services/decisionDebt.js.
 */
export function getDecisionDebt(projectId) {
  // Simulated data or logic to retrieve decision debt details for a project
  const decisionDebtData = {
    projectId,
    debtItems: [
      {
        id: 1,
        description: 'Use of outdated authentication method',
        impact: 'High',
        resolutionPlan: 'Implement OAuth2 by Q3',
      },
      {
        id: 2,
        description: 'Hardcoded API endpoints',
        impact: 'Medium',
        resolutionPlan: 'Refactor to use environment variables',
      },
    ],
  };

  return decisionDebtData;
}