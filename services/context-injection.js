/**
 * SYNOPSIS: Exports calculateTokenBudget — services/context-injection.js.
 */
export function calculateTokenBudget(totalBudget, usagePercentage) {
  return Math.floor(totalBudget * usagePercentage);
}

export function truncateContext(context, budget) {
  if (context.length <= budget) {
    return context;
  }
  return context.substring(0, budget);
}