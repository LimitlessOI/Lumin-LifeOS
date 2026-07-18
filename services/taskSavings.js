/**
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
// services/taskSavings.js

/**
 * SYNOPSIS: Exports calculateSavings and calculateGeneralTaskSavings — services/taskSavings.js.
 */

// Function to calculate savings based on task type and amount
function calculateSavings(taskType, amount) {
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

// New function specifically for calculating general task savings
function calculateGeneralTaskSavings(amount) {
  const savingsRate = 0.15; // Ensure 15% savings for general task type
  return amount * savingsRate;
}

// Export both functions
export { calculateSavings, calculateGeneralTaskSavings };

