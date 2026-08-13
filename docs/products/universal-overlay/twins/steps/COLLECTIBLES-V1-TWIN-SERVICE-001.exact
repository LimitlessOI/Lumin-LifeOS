/**
 * SYNOPSIS: CollectibleTwin create/update helpers.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */

const IDENTITY_STATUS = Object.freeze([
  'unregistered',
  'owned_unverified',
  'owned_canonical',
  'owned_physical_scan',
  'owned_condition_verified',
  'reverification',
]);

function assertNoMarketplaceCard(input) {
  if (input && (input.type === 'MarketplaceCard' || input.MarketplaceCard)) {
    throw new Error('MarketplaceCard type is forbidden on CollectibleTwin');
  }
}

/**
 * Create a CollectibleTwin from input. Keeps ownership, possession, custody,
 * and location as SEPARATE fields (do not collapse).
 * @param {object} input
 */
export function createCollectibleTwin(input = {}) {
  assertNoMarketplaceCard(input);
  const representation_level = Number(input.representation_level ?? 1);
  if (!Number.isInteger(representation_level) || representation_level < 1 || representation_level > 4) {
    throw new Error('representation_level must be integer 1-4');
  }
  const identity_status = IDENTITY_STATUS.includes(input.identity_status)
    ? input.identity_status
    : 'unregistered';
  const needs_review = Boolean(input.needs_review);
  const needs_review_reasons = Array.isArray(input.needs_review_reasons)
    ? input.needs_review_reasons.map(String)
    : [];
  return {
    id: input.id || crypto.randomUUID(),
    owner_user_id: input.owner_user_id || null,
    household_id: input.household_id || null,
    category_id: input.category_id || null,
    adapter_id: input.adapter_id || null,
    representation_level,
    identity_status,
    needs_review,
    needs_review_reasons,
    display_name: input.display_name || '',
    ownership: input.ownership ?? null,
    possession: input.possession ?? null,
    custody: input.custody ?? null,
    location: input.location ?? null,
    created_at: input.created_at || new Date().toISOString(),
    updated_at: input.updated_at || new Date().toISOString(),
  };
}

/**
 * Update a CollectibleTwin with a patch. Ownership/possession/custody/location
 * stay separate fields.
 * @param {object} twin
 * @param {object} patch
 */
export function updateCollectibleTwin(twin, patch = {}) {
  if (!twin || typeof twin !== 'object') throw new Error('twin required');
  assertNoMarketplaceCard(patch);
  const next = {
    ...twin,
    ownership: Object.prototype.hasOwnProperty.call(patch, 'ownership') ? patch.ownership : twin.ownership,
    possession: Object.prototype.hasOwnProperty.call(patch, 'possession') ? patch.possession : twin.possession,
    custody: Object.prototype.hasOwnProperty.call(patch, 'custody') ? patch.custody : twin.custody,
    location: Object.prototype.hasOwnProperty.call(patch, 'location') ? patch.location : twin.location,
  };
  if (patch.representation_level != null) {
    const representation_level = Number(patch.representation_level);
    if (!Number.isInteger(representation_level) || representation_level < 1 || representation_level > 4) {
      throw new Error('representation_level must be integer 1-4');
    }
    next.representation_level = representation_level;
  }
  if (patch.identity_status != null) {
    if (!IDENTITY_STATUS.includes(patch.identity_status)) {
      throw new Error(`invalid identity_status: ${patch.identity_status}`);
    }
    next.identity_status = patch.identity_status;
  }
  if (patch.needs_review != null) next.needs_review = Boolean(patch.needs_review);
  if (patch.needs_review_reasons != null) {
    next.needs_review_reasons = Array.isArray(patch.needs_review_reasons)
      ? patch.needs_review_reasons.map(String)
      : [];
  }
  if (patch.display_name != null) next.display_name = String(patch.display_name);
  next.updated_at = new Date().toISOString();
  return next;
}
