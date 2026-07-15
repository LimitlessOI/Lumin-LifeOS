/**
 * SYNOPSIS: Assume codegenTaskType is an object with properties related to codegen tasks
 */
// Assume codegenTaskType is an object with properties related to codegen tasks
// and TOON is a configuration object that modifies those tasks
export function calculateCodegenSavings(codegenTaskType, TOON) {
  const baseCost = codegenTaskType.baseCost;
  const toonMultiplier = TOON.enabled ? 0.9 : 1;
  const savings = baseCost * (1 - toonMultiplier);
  
  if (TOON.enabled && savings / baseCost > 0.10) {
    return savings;
  }
  return 0;
}
