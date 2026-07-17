/**
 * SYNOPSIS: Export the functions
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
const dataSources = {
  PLAID: 'Plaid',
  CSV: 'CSV',
};

function makeDecision(usePlaid) {
  return usePlaid ? dataSources.PLAID : dataSources.CSV;
}

// Helper function to determine if Plaid should be used based on configuration
function checkConfigForPlaid() {
  // Placeholder logic for determining if Plaid should be used
  // This would typically involve checking environment variables, feature flags, or user settings.
  return true; // For MVP, we might default to Plaid if available, or false for CSV-only.
}

function decidePlaidVsCSV() {
  const usePlaid = checkConfigForPlaid();
  return makeDecision(usePlaid);
}

// Export the functions
export { makeDecision, decidePlaidVsCSV };
