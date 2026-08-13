/**
 * SYNOPSIS: Owner export + privacy redaction for Collectible projections.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */

const PRIVATE_KEYS = new Set([
  'geo',
  'location',
  'location_label',
  'private_threshold_cents',
  'guest_claim_token_hash',
  'owner_user_id',
  'household_id',
]);

/**
 * @param {{ logger?: object }} [deps]
 */
export function createExportPrivacyService(deps = {}) {
  const log = deps.logger || { info() {}, warn() {}, error() {} };

  function redactForPublic(twin = {}) {
    const out = { ...twin };
    for (const key of PRIVATE_KEYS) delete out[key];
    if (out.liquidity_posture === 'private_threshold') {
      out.liquidity_posture = 'open_to_offers';
    }
    return out;
  }

  function exportOwnerBundle(twins = []) {
    const rows = Array.isArray(twins) ? twins : [];
    log.info?.({ count: rows.length }, 'exportOwnerBundle');
    return {
      exported_at: new Date().toISOString(),
      count: rows.length,
      twins: rows.map((t) => ({ ...t })),
      privacy: 'owner_full',
    };
  }

  return { redactForPublic, exportOwnerBundle };
}
