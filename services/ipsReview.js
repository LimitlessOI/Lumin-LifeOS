/**
 * SYNOPSIS: services/ipsReview.js
 */
// services/ipsReview.js

export function reviewIPSRisk(ipsModule) {
  let riskLevel = 'low';

  // Simple check for RIA trigger risk
  if (ipsModule.riaTriggers && ipsModule.riaTriggers.length > 0) {
    riskLevel = 'high';
  }

  return {
    moduleName: ipsModule.name,
    riskLevel,
    triggerCount: ipsModule.riaTriggers ? ipsModule.riaTriggers.length : 0
  };
}
