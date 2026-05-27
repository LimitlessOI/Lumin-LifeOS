/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 *
 * BuilderOS Command & Control Commit Proof Module.
 * Provides an internal smoke proof for the BuilderOS C2 commit path verification.
 * This module generates a simple, self-contained proof object with a timestamp.
 * It includes internal validation and formatting utilities to ensure consistency
 * and adherence to BuilderOS internal standards.
 */

// --- Module Constants ---
const BUILDEROS_C2_PROOF_VERSION = '1.0.0';
const PROOF_SOURCE_IDENTIFIER = 'builderos-command-control';
const PROOF_OK_STATUS = true;

/**
 * Validates the structure and content of a BuilderOS C2 commit proof object.
 * Ensures that the object contains the expected fields with correct types and formats.
 *
 * @param {object} proofObject - The proof object to validate.
 * @returns {boolean} True if the proof object is valid, false otherwise.
 */
function validateProofShape(proofObject) {
  if (typeof proofObject !== 'object' || proofObject === null) {
    console.error('Validation Error: Proof object is not an object or is null.');
    return false;
  }

  if (!('ok' in proofObject) || typeof proofObject.ok !== 'boolean') {
    console.error('Validation Error: Proof object missing "ok" field or it is not a boolean.');
    return false;
  }

  if (!('source' in proofObject) || typeof proofObject.source !== 'string' || proofObject.source.length === 0) {
    console.error('Validation Error: Proof object missing "source" field, it is not a string, or is empty.');
    return false;
  }

  if (!('generated_at' in proofObject) || typeof proofObject.generated_at !== 'string') {
    console.error('Validation Error: Proof object missing "generated_at" field or it is not a string.');
    return false;
  }

  // Validate ISO 8601 format for generated_at
  try {
    const date = new Date(proofObject.generated_at);
    if (isNaN(date.getTime()) || date.toISOString() !== proofObject.generated_at) {
      console.error('Validation Error: "generated_at" is not a valid ISO 8601 string.');
      return false;
    }
  } catch (e) {
    console.error('Validation Error: "generated_at" parsing failed.', e);
    return false;
  }

  return true;
}

/**
 * Formats a given JavaScript object into a human-readable JSON string with 2-space indentation.
 *
 * @param {object} data - The object to be formatted.
 * @returns {string} A JSON string representation of the object.
 */
function formatProofJson(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Generates a BuilderOS C2 commit proof object.
 * This function creates an object indicating successful proof generation,
 * specifying the source and the exact time of generation in ISO 8601 format.
 *
 * @returns {{ok: boolean, source: string, generated_at: string}} The generated proof object.
 * @exp getBuilderOSC2CommitProof
 */
export function getBuilderOSC2CommitProof() {
  const proof = {
    ok: PROOF_OK_STATUS,
    source: PROOF_SOURCE_IDENT