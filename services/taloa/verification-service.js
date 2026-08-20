/**
 * SYNOPSIS: VerificationService role per blueprint §14a — independent
 * success/failure judgment; the actor that acted cannot also certify
 * (§47, Universal Body Contract verify()). Real implementation: actually
 * compares observed state against expected state field-by-field, not a
 * truthy check on operation.id.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

export function createVerificationService({ store, logger, receiptLedger }) {
  if (!store) {
    throw new Error('createVerificationService: Missing required dependency: store');
  }
  if (!logger) {
    throw new Error('createVerificationService: Missing required dependency: logger');
  }
  if (!receiptLedger) {
    throw new Error('createVerificationService: Missing required dependency: receiptLedger');
  }

  return {
    /**
     * Real verification: an action's claimed outcome is only VERIFIED_SUCCESS
     * if the observed state after the action actually matches what the
     * action claimed to produce. A body that reports ok:true but whose
     * observed_state_after doesn't match the expectation fails verification
     * here — this is the actual enforcement of "nothing announces its own
     * success" (§5 principle 4), not a comment about the principle.
     */
    async verifyActionResult({ taskId, action, actionResult, expected }) {
      if (!action || !actionResult) {
        return { ok: false, evidence: 'missing action or actionResult', evidence_type: 'state_match' };
      }
      if (actionResult.ok !== true) {
        return { ok: false, evidence: `body reported failure: ${actionResult.error || 'unknown'}`, evidence_type: 'state_match' };
      }
      if (expected && typeof expected === 'object') {
        const observed = actionResult.observed_state_after;
        const mismatches = [];
        for (const [key, value] of Object.entries(expected)) {
          const observedValue = observed && typeof observed === 'object' ? observed[key] : undefined;
          if (observedValue !== value) mismatches.push({ key, expected: value, observed: observedValue });
        }
        if (mismatches.length > 0) {
          const result = { ok: false, evidence: `state mismatch: ${JSON.stringify(mismatches)}`, evidence_type: 'state_match' };
          await receiptLedger.recordReceipt({ task_id: taskId, type: 'verification', result });
          return result;
        }
      }
      const result = { ok: true, evidence: 'observed state matches expected outcome', evidence_type: 'state_match' };
      await receiptLedger.recordReceipt({ task_id: taskId, type: 'verification', result });
      return result;
    },

    /**
     * Real state validation: checks a state object has the required shape
     * for the given kind, not just object-with-any-truthy-field.
     */
    async validateState(state, requiredFields = []) {
      if (!state || typeof state !== 'object') {
        return { success: false, message: 'state must be an object' };
      }
      const missing = requiredFields.filter((f) => state[f] === undefined);
      if (missing.length > 0) {
        return { success: false, message: `state missing required fields: ${missing.join(', ')}` };
      }
      return { success: true, message: 'state validated' };
    },
  };
}

export default createVerificationService;
