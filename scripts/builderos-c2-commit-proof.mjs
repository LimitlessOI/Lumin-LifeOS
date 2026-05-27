/**
 * @file scripts/builderos-c2-commit-proof.mjs
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * @description Provides a smoke proof for BuilderOS Command & Control commit-path verification.
 * This module generates a simple object indicating successful generation and supports CLI execution.
 */

// --- Module Constants ---
const BUILDEROS_C2_PROOF_VERSION = '1.0.0';
const BUILDEROS_C2_PROOF_SOURCE = 'builderos-command-control';
const BUILDEROS_C2_PROOF_OK_STATUS = true;

/**
 * Validates the shape and basic types of a BuilderOS C2 commit proof object.
 * This helper ensures the generated proof adheres to expected structure.
 *
 * @param {object} proofObject The proof object to validate.
 * @returns {boolean} True if the object has the expected shape, false otherwise.
 */
function validateProofShape(proofObject) {
  if (typeof proofObject !== 'object' || proofObject === null) {
    return false;
  }
  if (typeof proofObject.ok !== 'boolean') {
    return false;
  }
  if (typeof proofObject.source !== 'string' || proofObject.source.length === 0) {
    return false;
  }
  if (typeof proofObject.generated_at !== 'string' || proofObject.generated_at.length === 0) {
    return false;
  }
  // Basic ISO 8601 format check (starts with YYYY-MM-DDTHH:MM:SS.sssZ)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(proofObject.generated_at)) {
    return false;
  }
  return true;
}

/**
 * Formats a given object into a pretty-printed JSON string.
 * This helper is used for consistent output formatting, especially for CLI.
 *
 * @param {object} data The object to stringify.
 * @returns {string} The JSON string representation of the object.
 */
function formatProofJson(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Generates a BuilderOS Command & Control commit proof object.
 * This function creates a simple object indicating successful generation
 * with a timestamp.
 *
 * @returns {object} An object containing the proof details.
 *   - ok: boolean indicating success.
 *   - source: string identifying the proof source.
 *   - generated_at: ISO 8601 string of the generation timestamp.
 */
export function getBuilderOSC2CommitProof() {
  const proof = {
    ok: BUILDEROS_C2_PROOF_OK_STATUS,
    source: BUILDEROS_C2_PROOF_SOURCE,
    generated_at: new Date().toISOString(),
    version: BUILDEROS_C2