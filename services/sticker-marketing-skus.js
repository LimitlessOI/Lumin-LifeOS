/**
 * SYNOPSIS: New function to enhance SKUs with tier-based bundles
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
const stickerSKUs = [];

function getStickerSKUs() {
  return stickerSKUs;
}

function addStickerSKU(sku) {
  if (!stickerSKUs.includes(sku)) {
    stickerSKUs.push(sku);
  }
}

function createBundleSKUs() {
  const bundleSKU = "website-automation-social";
  if (!stickerSKUs.includes(bundleSKU)) {
    stickerSKUs.push(bundleSKU);
  }
}

// New function to enhance SKUs with tier-based bundles
function enhanceSKUsWithTiers(tier) {
  const tierBundleSKU = `bundle-tier-${tier}`;
  if (!stickerSKUs.includes(tierBundleSKU)) {
    stickerSKUs.push(tierBundleSKU);
  }
}

// Function to update sticker SKUs
function updateStickerSkus(tiers) {
  tiers.forEach(tier => {
    enhanceSKUsWithTiers(tier);
  });
}

export { getStickerSKUs, addStickerSKU, createBundleSKUs, enhanceSKUsWithTiers, updateStickerSkus };
