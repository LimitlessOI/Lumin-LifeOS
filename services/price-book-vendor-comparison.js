/**
 * SYNOPSIS: Exports compareVendors — services/price-book-vendor-comparison.js.
 */
export function compareVendors(vendors, criteria) {
  if (!Array.isArray(vendors) || typeof criteria !== 'object') {
    throw new Error('Invalid input');
  }

  const { include, exclude } = criteria;

  return vendors.filter(vendor => {
    let isValid = true;

    if (include) {
      if (include.price) {
        isValid = isValid && vendor.price <= include.price;
      }
      if (include.reviews) {
        isValid = isValid && vendor.reviews >= include.reviews;
      }
    }

    if (exclude) {
      if (exclude.price) {
        isValid = isValid && vendor.price > exclude.price;
      }
      if (exclude.reviews) {
        isValid = isValid && vendor.reviews < exclude.reviews;
      }
    }

    return isValid;
  });
}