/**
 * SYNOPSIS: The only live product build queue — overlay — and the codes that
 * refuse every other queue, including minting a new one.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export const LIVE_BUILD_QUEUE_PRODUCT = 'universal-overlay';
export const LIVE_BUILD_QUEUE_REL = 'docs/products/universal-overlay/BUILD_QUEUE.json';
export const SECOND_QUEUE_FORBIDDEN = 'SECOND_QUEUE_FORBIDDEN';
export const NEW_QUEUE_FORBIDDEN = 'NEW_QUEUE_FORBIDDEN';

export function normalizeQueueRel(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
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
