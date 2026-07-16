/**
 * SYNOPSIS: Exports optimizeGeneralTaskSavings — services/generalTaskOptimizer.js.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
export function optimizeGeneralTaskSavings(task) {
  const baseSavings = 0.15; // Increased from 0.04 to 0.15
  const optimizationFactor = 1.1; // Further tuning factor

  const calculateSavings = (task) => {
    let savings = baseSavings;
    if (task.priority === 'high') {
      savings *= optimizationFactor;
    }
    if (task.complexity === 'low') {
      savings *= optimizationFactor;
    }
    return savings;
  };

  task.savings = calculateSavings(task);
  return task;
}

export function optimizeGeneralTask(task) {
  return optimizeGeneralTaskSavings(task);
}