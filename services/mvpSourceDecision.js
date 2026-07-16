/**
 * SYNOPSIS: Service module — MvpSourceDecision.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
const dataSources = {
  PLAID: 'Plaid',
  CSV: 'CSV',
};

function selectMVPSource(usePlaid) {
  return usePlaid ? dataSources.PLAID : dataSources.CSV;
}

export { selectMVPSource };

/**
 * Decides the data source for MVP, based on a configuration or condition.
 * @returns {string} - 'Plaid' or 'CSV'
 */
function decideMVPSource() {
  const usePlaid = checkConfigForPlaid(); // Assume this function checks the necessary config or condition
  return selectMVPSource(usePlaid);
}

export { decideMVPSource };

// Helper function to determine if Plaid should be used based on configuration
function checkConfigForPlaid() {
  // Placeholder logic for determining if Plaid should be used
  return true; // Replace with actual logic
}
