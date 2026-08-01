/**
 * SYNOPSIS: Exposes an endpoint for comparing vendor offerings from the price book (Vendor Comparison).
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
export function registerPriceBookVendorComparisonRoutes(app) {
  // Vendor Comparison: expose price-book vendor comparison data with optional explanations/exclusions.
  app.get('/api/v1/price-book/vendor-comparison', (req, res) => {
    const { includeExplanations, excludeCriteria } = req.query;

    let vendorComparisonData = getVendorComparisonData();

    if (includeExplanations === 'true') {
      vendorComparisonData = vendorComparisonData.map(item => ({
        ...item,
        explanation: getExplanationForItem(item),
      }));
    }

    if (excludeCriteria) {
      const maxPrice = Number(excludeCriteria);
      vendorComparisonData = vendorComparisonData.filter(item => !matchesCriteria(item, maxPrice));
    }

    res.json(vendorComparisonData);
  });
}

function getVendorComparisonData() {
  return [
    { id: 1, name: 'Vendor A', price: 100 },
    { id: 2, name: 'Vendor B', price: 150 },
    { id: 3, name: 'Vendor C', price: 90 },
  ];
}

function getExplanationForItem(item) {
  return `Explanation for ${item.name}`;
}

function matchesCriteria(item, criteria) {
  return item.price > criteria;
}
