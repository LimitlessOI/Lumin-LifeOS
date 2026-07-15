/**
 * SYNOPSIS: Exports calculateSavings — services/taskSavings.js.
 */
export function calculateSavings(taskType, amount) {
  let savingsRate;
  
  switch (taskType) {
    case 'general':
      savingsRate = 0.15; // Increased from 4% to 15%
      break;
    // other task types can be handled here
    default:
      savingsRate = 0; // Default savings rate if task type doesn't match
  }
  
  return amount * savingsRate;
}
