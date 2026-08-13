/**
 * SYNOPSIS: Live product build queues. Overlay remains the primary money
 * queue. Collectibles is the only additional live queue — owned by factory-3
 * so overlay factories are not stolen. Every other product queue stays forbidden.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/** @deprecated use LIVE_BUILD_QUEUE_PRODUCTS[0] — kept for callers that expect a string */
export const LIVE_BUILD_QUEUE_PRODUCT = 'universal-overlay';

/** Founder-authorized live queues (2026-08-12): overlay + Collectibles factory-3 lane. */
export const LIVE_BUILD_QUEUE_PRODUCTS = Object.freeze(['universal-overlay', 'collectibles']);

export const LIVE_BUILD_QUEUE_REL = 'docs/products/universal-overlay/BUILD_QUEUE.json';
export const COLLECTIBLES_BUILD_QUEUE_REL = 'docs/products/collectibles/BUILD_QUEUE.json';

export const SECOND_QUEUE_FORBIDDEN = 'SECOND_QUEUE_FORBIDDEN';
export const NEW_QUEUE_FORBIDDEN = 'NEW_QUEUE_FORBIDDEN';

export function normalizeQueueRel(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

export function isLiveQueueProduct(productId) {
  return LIVE_BUILD_QUEUE_PRODUCTS.includes(String(productId || '').trim());
}

export function isCanonicalLiveQueuePath(filePath) {
  const rel = normalizeQueueRel(filePath);
  if (rel === LIVE_BUILD_QUEUE_REL || rel.endsWith(`/${LIVE_BUILD_QUEUE_REL}`)) return true;
  if (rel === COLLECTIBLES_BUILD_QUEUE_REL || rel.endsWith(`/${COLLECTIBLES_BUILD_QUEUE_REL}`)) return true;
  return false;
}

export function isLiveQueueLocation(filePath) {
  const rel = normalizeQueueRel(filePath);
  if (/docs\/products\/[^/]+\/BUILD_QUEUE\.json$/.test(rel)) return true;
  if (/docs\/projects\/.+\/BUILD_QUEUE\.json$/.test(rel)) return true;
  return false;
}
