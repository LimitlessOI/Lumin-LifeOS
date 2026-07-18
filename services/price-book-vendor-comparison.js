/**
 * SYNOPSIS: Exports compareVendors — services/price-book-vendor-comparison.js.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
export function compareVendors(vendors, criteria) {
  if (!Array.isArray(vendors) || typeof criteria !== 'object') {
    throw new Error('Invalid input');
  }

  const { include, exclude, maxPrice } = criteria;
  const result = [];

  vendors.forEach(vendor => {
    let explanation = '';
    let isIncluded = true;

    // Logic to include based on criteria
    if (include && !include.some(criterion => vendor.reviews.includes(criterion))) {
      explanation += `Excluded due to missing required review criteria. `;
      isIncluded = false;
    }

    // Logic to exclude based on criteria
    if (exclude && exclude.some(criterion => vendor.reviews.includes(criterion))) {
      explanation += `Excluded due to matching an exclusion criterion. `;
      isIncluded = false;
    }

    // Logic to compare based on pricing
    if (vendor.pricing > maxPrice) {
      explanation += `Excluded due to pricing exceeding the maximum allowed. `;
      isIncluded = false;
    }

    if (isIncluded) {
      result.push(vendor);
    } else {
      result.push({ vendor, explanation: explanation.trim() });
    }
  });

  return result;
}
