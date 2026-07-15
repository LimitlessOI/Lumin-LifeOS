/**
 * SYNOPSIS: Service module — StripePricingService.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
const stripePriceIds = {
  basic: 'price_basic_123',
  standard: 'price_standard_456',
  premium: 'price_premium_789'
};

function getStripePriceIds() {
  return stripePriceIds;
}

export { getStripePriceIds };
