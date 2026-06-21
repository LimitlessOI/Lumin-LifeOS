/**
 * SYNOPSIS: This utility provides functionality to audit zone mutations within the BuilderOS platform.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 *
 * This utility provides functionality to audit zone mutations within the BuilderOS platform.
 * It processes a collection of zone mutation records and categorizes them by their
 * classification, returning a count for each classification found.
 */
// Define a constant for the default classification when one cannot be determined.
const UNKNOWN_CLASSIFICATION = 'unknown';

/**
 * Safely extracts the zone classification from a given mutation object.
 * If the mutation object or its zoneClassification property is invalid,
 * it defaults to UNKNOWN_CLASSIFICATION. The classification is trimmed
 * and converted to lowercase for consistent counting.
 *
 * @param {object} mutation - The mutation object to process.
 * @returns {string} The extracted zone classification or 'unknown'.
 */
function getZoneClassification(mutation) {
  if (
    !mutation ||
    typeof mutation !== 'object' ||
    typeof mutation.zoneClassification !== 'string' ||
    mutation.zoneClassification.trim() === ''
  ) {
    return UNKNOWN_CLASSIFICATION;
  }
  return mutation.zoneClassification.trim().toLowerCase();
}

/**
 * Audits a list of zone mutations and returns a count of mutations per zone classification.
 *
 * This function iterates through an array of mutation objects, extracts their
 * zone classification using a helper, and aggregates counts for each unique classification.
 * Mutations without a valid classification are grouped under 'unknown'.
 * Input validation ensures that non-array inputs are handled gracefully.
 *
 * @param {Array<object>} zoneMutations - An array of zone mutation objects.
 *   Each object is expected to have a 'zoneClassification' string property.
 * @returns {Object<string, number>} An object where keys are zone classifications
 *   (e.g., 'residential', 'commercial', 'unknown') and values are their respective counts.
 *   Returns an empty object if the input is not a valid array.
 *
 * @example
 * const mutations = [
 *   { id: 'm1', zoneClassification: 'Residential' },
 *   { id: 'm2', zoneClassification: 'Commercial' },
 *   { id: 'm3', zoneClassification: 'residential' },
 *   { id: 'm4', zoneClassification: null },
 *   { id: 'm5', zoneClassification: 'Industrial' },
 *   { id: 'm6', zoneClassification: '  Commercial  ' },
 *   { id: 'm7', someOtherProp: 'value' },
 * ];
 * const counts = auditZoneMutations(mutations);
 * // counts might be: { residential: 2, commercial: 2, industrial: 1, unknown: 2 }
 */
export function auditZoneMutations(zoneMutations) {
  if (!Array.isArray(zoneMutations)) {
    // Log a warning for non-array input but do not throw,
    // as per "never moralize or judge" and "does this work for the user".
    // An empty object is a valid outcome for no countable mutations.
    console.warn('auditZoneMutations received non-array input. Returning empty counts.');
    return {};
  }
  const classificationCounts = {};
  for (const mutation of zoneMutations) {
    const classification = getZoneClassification(mutation);
    classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
  }
  return classificationCounts;
}

/**
 * Returns the current version string for the Zone Audit utility.
 *
 * @returns {string} The version string.
 */
export function getZoneAuditVersion() {
  return "tsos-g2-verify-2";
}