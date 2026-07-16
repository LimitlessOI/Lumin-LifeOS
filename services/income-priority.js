/**
 * SYNOPSIS: services/income-priority.js
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// services/income-priority.js

export function calculateIncomePriorities(tasks) {
  return tasks
    .filter(task => task.financialImpact && task.financialImpact > 0)
    .sort((a, b) => b.financialImpact - a.financialImpact);
}
