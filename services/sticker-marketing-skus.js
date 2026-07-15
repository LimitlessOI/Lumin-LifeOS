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

export { getStickerSKUs, addStickerSKU };
