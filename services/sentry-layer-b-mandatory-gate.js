/**
 * SYNOPSIS: SO-002 mechanical enforcement — a product's BUILD_QUEUE reaching
 * "all steps done" must never be reported as finished while its own SENTRY
 * Layer B (real-browser human-sim walkthrough) is still a placeholder.
 * Founder directive 2026-08-20, after the universal-overlay queue reported
 * "0 shippable" with every §64 file-authoring step done while SENTRY's own
 * registry still said Layer B was REGISTERED_NOT_IMPLEMENTED — nothing in
 * the autonomous loop was checking that field before treating the product
 * as exhausted. This closes that gap for every SENTRY-registered product,
 * not just universal-overlay.
 *
 * Scope, stated honestly: this can only gate products that are actually
 * registered in SENTRY_PRODUCT_REGISTRY.json. Most products in
 * docs/products/PRODUCT_REGISTRY.json are not registered there at all yet —
 * that is a separate, larger gap (no SENTRY gate exists to check), not
 * something this function can silently cover.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = path.join(ROOT, 'builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json');

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {string} productId
 * @returns {{ registered: boolean, satisfied: boolean, unimplementedLayers: string[] }}
 *   registered:false means this product has no SENTRY entry at all -- there is
 *   nothing here to gate on, the caller should not treat that as passing.
 */
export function layerBGateStatus(productId) {
  const registry = loadRegistry();
  const product = registry?.products?.find((p) => p.id === productId);
  if (!product) return { registered: false, satisfied: false, unimplementedLayers: [] };

  const layers = Array.isArray(product.layers) ? product.layers : [];
  const bLayers = layers.filter((l) => /b/i.test(String(l?.name || '')));
  if (bLayers.length === 0) return { registered: true, satisfied: false, unimplementedLayers: ['(no Layer B declared)'] };

  const unimplemented = bLayers
    .filter((l) => String(l?.status || '').toUpperCase() !== 'IMPLEMENTED')
    .map((l) => `${l.name}:${l.status || 'unset'}`);

  return { registered: true, satisfied: unimplemented.length === 0, unimplementedLayers: unimplemented };
}

/**
 * Real, honest backlog text to feed into the SAME extend/re-plan pathway
 * ordinary documented backlog uses -- not a parallel mechanism, the proven one.
 */
export function layerBBacklogItem(productId, status) {
  return `MANDATORY (SO-002, mechanically enforced 2026-08-20): SENTRY Layer B (real-browser human-sim walkthrough) is not implemented for "${productId}" (${status.unimplementedLayers.join(', ')}). A BUILD_QUEUE reaching "all steps done" does not mean this product is finished until Layer B genuinely runs against a live deployment and produces a real pass receipt. Implement the real walkthrough script (not a stub), register it as run, and update builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json's Layer B status to IMPLEMENTED only once a real receipt exists.`;
}
