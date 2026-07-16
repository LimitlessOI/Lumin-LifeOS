/**
 * SYNOPSIS: Export the functions
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
const dataSources = {
  PLAID: 'Plaid',
  CSV: 'CSV',
};

function selectMVPSource(usePlaid) {
  return usePlaid ? dataSources.PLAID : dataSources.CSV;
}

function decideMVPSource() {
  const usePlaid = checkConfigForPlaid(); // Assume this function checks the necessary config or condition
  return selectMVPSource(usePlaid);
}

// Export the functions
export { selectMVPSource, decideMVPSource };

// Helper function to determine if Plaid should be used based on configuration
function checkConfigForPlaid() {
  // Placeholder logic for determining if Plaid should be used
  return true; // Replace with actual logic
}
