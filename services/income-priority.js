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

export function getIncomePriorities(tasks) {
  return tasks
    .filter(task => task.money_impact && task.money_impact > 0)
    .sort((a, b) => b.money_impact - a.money_impact);
}
