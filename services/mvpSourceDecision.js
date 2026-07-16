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
