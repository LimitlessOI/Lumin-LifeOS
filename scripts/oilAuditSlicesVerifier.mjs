/**
 * SYNOPSIS: Calculates a SHA256 hash of the input string.
 */
import { createHash } from 'crypto';

/**
 * Calculates a SHA256 hash of the input string.
 * @param {string} data The string to hash.
 * @returns {string} The SHA256 hash as a hexadecimal string.
 */
function calculateSha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verifies the integrity and security of audit slices for both Phase 7 and S6.
 * This function ensures that each slice's hash matches its content, and that
 * the sequence of slices is unbroken and correctly linked.
 *
 * @param {Array<Object>} auditSlices An array of audit slice objects.
 *   Each object is expected to have:
 *   - `id`: A unique identifier for the slice.
 *   - `content`: The data content of the slice.
 *   - `hash`: The expected SHA256 hash of the content.
 *   - `previousSliceHash`: The hash of the preceding slice, or null for the first slice.
 * @param {string} phase The phase identifier (e.g., 'Phase 7', 'S6') to apply specific verification logic.
 * @returns {{isValid: boolean, message: string}} An object indicating validity and a message.
 */
export function verifyAuditSlices(auditSlices, phase) {
  if (!Array.isArray(auditSlices) || auditSlices.length === 0) {
    return { isValid: false, message: 'No audit slices provided for verification.' };
  }

  let previousHash = null;

  for (let i = 0; i < auditSlices.length; i++) {
    const currentSlice = auditSlices[i];

    if (!currentSlice || typeof currentSlice.content === 'undefined' || !currentSlice.hash) {
      return { isValid: false, message: `Slice ${i} is malformed: missing content or hash.` };
    }

    const calculatedHash = calculateSha256(currentSlice.content);

    if (calculatedHash !== currentSlice.hash) {
      return { isValid: false, message: `Slice ${i} content hash mismatch. Expected ${currentSlice.hash}, got ${calculatedHash}.` };
    }

    if (i === 0) {
      // First slice
      if (currentSlice.previousSliceHash !== null) {
        return { isValid: false, message: 'First slice must have a null previousSliceHash.' };
      }
    } else {
      // Subsequent slices
      if (currentSlice.previousSliceHash !== previousHash) {
        return { isValid: false, message: `Slice ${i} previous hash mismatch. Expected ${previousHash}, got ${currentSlice.previousSliceHash}.` };
      }
    }

    // Phase-specific or S6-specific checks can be added here if needed,
    // but the core logic for integrity and chaining is the same.
    // The prompt specifies reusing Phase 7 verification for S6, so the general
    // integrity and chaining checks cover both.
    if (phase === 'Phase 7' || phase === 'S6') {
      // Example: Additional check for specific content patterns or metadata
      // For now, the existing integrity checks are sufficient for the reuse requirement.
      // If Phase 7 had unique checks, they would be applied here, and now for S6.
      // E.g., if (currentSlice.metadata && !currentSlice.metadata.timestamp) { /* ... */ }
    }


    previousHash = calculatedHash;
  }

  return { isValid: true, message: `All ${phase} audit slices verified successfully.` };
}
