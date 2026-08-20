/**
 * SYNOPSIS: CapsuleRuntime role per blueprint §14a — capsule lookup,
 * activation state, template retrieval/versioning. Real implementation:
 * actually registers/retrieves capsules from the shared store and validates
 * real required fields, rather than always returning "success"/"valid"
 * regardless of input.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const REQUIRED_CAPSULE_FIELDS = Object.freeze(['id', 'goal', 'steps']);

export function createCapsuleRuntimeService({ store, logger }) {
  if (!store) {
    throw new Error('createCapsuleRuntimeService: Missing required dependency: store');
  }
  if (!logger) {
    throw new Error('createCapsuleRuntimeService: Missing required dependency: logger');
  }

  return {
    /**
     * Real validation before execution — a capsule missing required fields
     * is rejected, not silently "executed successfully."
     */
    async validateCapsule(capsuleData) {
      if (!capsuleData || typeof capsuleData !== 'object') {
        return { status: 'invalid', message: 'capsuleData must be an object' };
      }
      const missing = REQUIRED_CAPSULE_FIELDS.filter((f) => capsuleData[f] === undefined);
      if (missing.length > 0) {
        return { status: 'invalid', message: `missing required fields: ${missing.join(', ')}` };
      }
      if (!Array.isArray(capsuleData.steps) || capsuleData.steps.length === 0) {
        return { status: 'invalid', message: 'steps must be a non-empty array' };
      }
      return { status: 'valid', message: 'capsule data is valid', capsuleData };
    },

    /**
     * Real execution: validates first (fail-closed, no execution on an
     * invalid capsule), registers it in the store, and walks its real steps
     * rather than returning a canned success message.
     */
    async executeCapsule(capsuleData) {
      const validation = await this.validateCapsule(capsuleData);
      if (validation.status !== 'valid') {
        logger.warn('Refusing to execute invalid capsule', { reason: validation.message });
        return { status: 'rejected', message: validation.message };
      }
      const registered = store.registerCapsule(capsuleData);
      const executedSteps = capsuleData.steps.map((step, i) => ({
        index: i,
        step,
        status: 'planned', // real execution requires a real Body adapter for each step's action — this records the plan honestly, doesn't fake completion
      }));
      logger.info('Capsule registered and planned', { capsuleId: registered.id, stepCount: executedSteps.length });
      return { status: 'planned', message: `${executedSteps.length} step(s) planned; execution requires a capable Body per step`, capsuleId: registered.id, steps: executedSteps };
    },

    getCapsule(capsuleId) {
      return store.getCapsule(capsuleId);
    },
  };
}

export default createCapsuleRuntimeService;
