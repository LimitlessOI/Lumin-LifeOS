/**
 * SYNOPSIS: Exports compareVendors — services/price-book-vendor-comparison.js.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
[
  {
    "old_string":"return vendors.filter(vendor => {",
    "new_string":"export function compareVendors(vendors, criteria) { if (!Array.isArray(vendors) || typeof criteria !== 'object') { throw new Error('Invalid input'); } const { include, exclude } = criteria; return vendors.filter(vendor => {"
  },
  {
    "old_string":"REQUIRED NAMED EXPORTS: compareVendors",
    "new_string":""
  }
]