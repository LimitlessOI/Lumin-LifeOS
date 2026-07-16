/**
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Service module — Sticker Marketing Skus.
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

export { getStickerSKUs, addStickerSKU, createBundleSKUs };