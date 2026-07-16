/**
 * SYNOPSIS: Exports getBundleSKUs — services/dialogue-bundle-skus.js.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
const bundleSKUs = {
  website: 'BUNDLE_WEBSITE_001',
  automation: 'BUNDLE_AUTOMATION_002',
  social: 'BUNDLE_SOCIAL_003',
};

export function getBundleSKUs() {
  return bundleSKUs;
}
