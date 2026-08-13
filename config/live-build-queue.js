/**
 * SYNOPSIS: There is ONE live manufacturing queue. Multiple factories and
 * multiple product blueprints feed that queue — they do not mint second
 * BUILD_QUEUE.json files. Steps carry product_id + source citing the BP;
 * factories pick by lane ownership of target_file.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/** Canonical host id for the one queue file (path under docs/products/). */
export const LIVE_BUILD_QUEUE_PRODUCT = 'universal-overlay';

/** @deprecated kept for callers that still expect an array — always one entry. */
export const LIVE_BUILD_QUEUE_PRODUCTS = Object.freeze([LIVE_BUILD_QUEUE_PRODUCT]);

export const LIVE_BUILD_QUEUE_REL = 'docs/products/universal-overlay/BUILD_QUEUE.json';

export const SECOND_QUEUE_FORBIDDEN = 'SECOND_QUEUE_FORBIDDEN';
export const NEW_QUEUE_FORBIDDEN = 'NEW_QUEUE_FORBIDDEN';

export function normalizeQueueRel(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

export function isLiveQueueProduct(productId) {
  return String(productId || '').trim() === LIVE_BUILD_QUEUE_PRODUCT;
}

export function isCanonicalLiveQueuePath(filePath) {
  const rel = normalizeQueueRel(filePath);
  return rel === LIVE_BUILD_QUEUE_REL || rel.endsWith(`/${LIVE_BUILD_QUEUE_REL}`);
}

export function isLiveQueueLocation(filePath) {
  const rel = normalizeQueueRel(filePath);
  if (/docs\/products\/[^/]+\/BUILD_QUEUE\.json$/.test(rel)) return true;
  if (/docs\/projects\/.+\/BUILD_QUEUE\.json$/.test(rel)) return true;
  return false;
}
