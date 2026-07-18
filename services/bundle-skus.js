/**
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
// services/bundle-skus.js

/**
 * SYNOPSIS: Exports createBundleSKUs — services/bundle-skus.js.
 */
export function createBundleSKUs() {
  const bundles = [
    {
      bundle_id: "website_automation_social_starter",
      name: "Website + Automation + Social Starter",
      tiers: ["website", "automation", "social"],
      description: "A bundled SKU that combines the three core delivery tiers into one offering.",
    },
    {
      bundle_id: "website_automation_social_pro",
      name: "Website + Automation + Social Pro",
      tiers: ["website", "automation", "social"],
      description: "A higher-touch bundled SKU for more customized implementation across all three tiers.",
    },
  ];

  return bundles;
}
