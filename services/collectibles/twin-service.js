/**
 * SYNOPSIS: Creates a new Collectible Twin object.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCT_HOME_PATH = path.join(__dirname, '..', '..', 'docs', 'products', 'collectibles', 'PRODUCT_HOME.md');

const SCHEMA_CONTRACTS = Object.freeze({
  REPRESENTATION_LEVELS: Object.freeze([1, 2, 3, 4]),
  IDENTITY_STATUSES: Object.freeze(['pending', 'verified', 'rejected', 'unverified']),
  FORBIDDEN_TYPES: Object.freeze(['MarketplaceCard'])
});

function loadProductHome() {
  try {
    return readFileSync(PRODUCT_HOME_PATH, 'utf8');
  } catch {
    return '';
  }
}

function validateRepresentationLevel(value) {
  if (!SCHEMA_CONTRACTS.REPRESENTATION_LEVELS.includes(value)) {
    throw new Error(`representation_level must be one of ${SCHEMA_CONTRACTS.REPRESENTATION_LEVELS.join(', ')}`);
  }
}

function validateIdentityStatus(value) {
  if (!SCHEMA_CONTRACTS.IDENTITY_STATUSES.includes(value)) {
    throw new Error(`identity_status must be one of ${SCHEMA_CONTRACTS.IDENTITY_STATUSES.join(', ')}`);
  }
}

function validateNeedsReview(value, reasons) {
  if (typeof value !== 'boolean') {
    throw new Error('needs_review must be a boolean');
  }
  if (!Array.isArray(reasons)) {
    throw new Error('reasons must be an array');
  }
  if (value && reasons.length === 0) {
    throw new Error('reasons must not be empty when needs_review is true');
  }
  if (!value && reasons.length > 0) {
    throw new Error('reasons must be empty when needs_review is false');
  }
  if (!reasons.every((r) => typeof r === 'string')) {
    throw new Error('all reasons must be strings');
  }
}

function validateType(type) {
  if (SCHEMA_CONTRACTS.FORBIDDEN_TYPES.includes(type)) {
    throw new Error(`type "${type}" is forbidden by schema contracts`);
  }
}

function normalizePatch(patch) {
  const normalized = { ...patch };
  if (normalized.ownership !== undefined && normalized.ownership !== null && typeof normalized.ownership !== 'object') {
    throw new Error('ownership must be an object or null');
  }
  if (normalized.possession !== undefined && normalized.possession !== null && typeof normalized.possession !== 'object') {
    throw new Error('possession must be an object or null');
  }
  if (normalized.custody !== undefined && normalized.custody !== null && typeof normalized.custody !== 'object') {
    throw new Error('custody must be an object or null');
  }
  if (normalized.location !== undefined && normalized.location !== null && typeof normalized.location !== 'object') {
    throw new Error('location must be an object or null');
  }
  return normalized;
}

/**
 * Creates a new Collectible Twin object.
 * Enforces representation_level 1-4, needs_review boolean + reasons[], identity_status enums.
 * Keeps ownership, possession, custody, and location as SEPARATE fields.
 * Forbids MarketplaceCard type.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 * @param {object} input - The input data for creating the collectible twin.
 * @param {string} input.type - The type of the collectible.
 * @param {number} input.representation_level - The representation level (1-4).
 * @param {boolean} [input.needs_review=false] - Indicates if the twin needs review.
 * @param {string[]} [input.reasons=[]] - Reasons for needing review.
 * @param {string} input.identity_status - The identity status of the collectible.
 * @param {object|null} [input.ownership=null] - Ownership details.
 * @param {object|null} [input.possession=null] - Possession details.
 * @param {object|null} [input.custody=null] - Custody details.
 * @param {object|null} [input.location=null] - Location details.
 * @returns {object} The created collectible twin object.
 * @throws {Error} If input is invalid or violates schema contracts.
 */
export function createCollectibleTwin(input) {
  const productHome = loadProductHome();
  if (!productHome) {
    throw new Error('PRODUCT_HOME.md not found or unreadable');
  }

  if (!input || typeof input !== 'object') {
    throw new Error('input must be an object');
  }

  const {
    type,
    representation_level,
    needs_review = false,
    reasons = [],
    identity_status,
    ownership = null,
    possession = null,
    custody = null,
    location = null,
    ...rest
  } = input;

  if (!type || typeof type !== 'string') {
    throw new Error('type is required and must be a string');
  }
  validateType(type);

  if (representation_level === undefined) {
    throw new Error('representation_level is required');
  }
  validateRepresentationLevel(representation_level);

  validateNeedsReview(needs_review, reasons);

  if (identity_status === undefined) {
    throw new Error('identity_status is required');
  }
  validateIdentityStatus(identity_status);

  const normalized = normalizePatch({
    ownership,
    possession,
    custody,
    location
  });

  return {
    type,
    representation_level,
    needs_review,
    reasons: [...reasons],
    identity_status,
    ownership: normalized.ownership,
    possession: normalized.possession,
    custody: normalized.custody,
    location: normalized.location,
    ...rest,
    _productHomeHash: productHome.length
  };
}

/**
 * Updates an existing Collectible Twin object with a patch.
 * Enforces representation_level 1-4, needs_review boolean + reasons[], identity_status enums on patched fields.
 * Keeps ownership, possession, custody, and location as SEPARATE fields.
 * Forbids MarketplaceCard type if type is updated.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 * @param {object} twin - The existing collectible twin object.
 * @param {object} patch - The patch object containing updates.
 * @param {string} [patch.type] - The new type of the collectible.
 * @param {number} [patch.representation_level] - The new representation level (1-4).
 * @param {boolean} [patch.needs_review] - New value for needs_review.
 * @param {string[]} [patch.reasons] - New reasons for needing review.
 * @param {string} [patch.identity_status] - The new identity status.
 * @param {object|null} [patch.ownership] - New ownership details.
 * * @param {object|null} [patch.possession] - New possession details.
 * @param {object|null} [patch.custody] - New custody details.
 * @param {object|null} [patch.location] - New location details.
 * @returns {object} The updated collectible twin object.
 * @throws {Error} If twin or patch are invalid or violate schema contracts.
 */
export function updateCollectibleTwin(twin, patch) {
  if (!twin || typeof twin !== 'object') {
    throw new Error('twin must be an object');
  }
  if (!patch || typeof patch !== 'object') {
    throw new Error('patch must be an object');
  }

  const normalizedPatch = normalizePatch(patch);

  const merged = {
    ...twin,
    ...normalizedPatch
  };

  if (merged.type !== undefined) {
    validateType(merged.type);
  }
  if (merged.representation_level !== undefined) {
    validateRepresentationLevel(merged.representation_level);
  }
  // Validate needs_review and reasons together if either is present in the patch or already on the twin
  const effectiveNeedsReview = normalizedPatch.needs_review !== undefined ? normalizedPatch.needs_review : twin.needs_review;
  const effectiveReasons = normalizedPatch.reasons !== undefined ? normalizedPatch.reasons : twin.reasons;
  if (normalizedPatch.needs_review !== undefined || normalizedPatch.reasons !== undefined) {
    validateNeedsReview(effectiveNeedsReview, effectiveReasons);
  }
  if (merged.identity_status !== undefined) {
    validateIdentityStatus(merged.identity_status);
  }

  return merged;
}