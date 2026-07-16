/**
 * SYNOPSIS: Explicitly export the processLargeExports function
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
/**
 * Processes stream exports and handles those that are larger than 500KB.
 */
export function processStreamExports() {
  // existing implementation for processing stream exports

  /**
   * Handles exports larger than 500KB.
   * @param {Object} exportData - The export data object.
   */
  function handleLargeExports(exportData) {
    const SIZE_THRESHOLD = 500 * 1024; // 500KB in bytes
    if (exportData.size > SIZE_THRESHOLD) {
      // logic to handle large exports
    }
  }

  /**
   * New function to process large exports specifically.
   * @param {Object} exportData - The export data object.
   */
  function processLargeExports(exportData) {
    handleLargeExports(exportData);
    // Additional logic for large exports
  }

  // Ensure these functions are accessible
  return {
    handleLargeExports,
    processLargeExports,
    // any other necessary exports
  };
}

// Explicitly export the processLargeExports function
export const { processLargeExports } = processStreamExports();
