/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

export function normalizeTelemetryCycleContext(input) {
  /**
   * Normalize telemetry cycle context from input object.
   *
   * @param {object} input - Input object with optional sessionId and cycleId.
   * @returns {object} Normalized object with sessionId, cycleId, and hasSession properties.
   */
  if (input === null || input === undefined) {
    return { sessionId: null, cycleId: null, hasSession: false };
  }
  return {
    sessionId: input.sessionId !== null && input.sessionId !== undefined ? input.sessionId : null,
    cycleId: input.cycleId !== null && input.cycleId !== undefined ? input.cycleId : null,
    hasSession: input.sessionId !== null && input.sessionId !== undefined && input.cycleId !== null && input.cycleId !== undefined,
  };
}

export function hasTelemetryCycleContext(input) {
  /**
   * Check if input object has both sessionId and cycleId.
   *
   * @param {object} input - Input object with optional sessionId and cycleId.
   * @returns {boolean} True if input has both sessionId and cycleId, false otherwise.
   */
  return input !== null && input !== undefined && input.sessionId !== null && input.sessionId !== '' && input.cycleId !== null && input.cycleId !== '';
}

export function shouldEmitOuterTelemetry(cycleDef) {
  /**
   * Determine if outer telemetry should be emitted based on cycleDef.
   *
   * @param {object} cycleDef - Cycle definition object with emitsOwnTelemetry property.
   * @returns {boolean} True if outer telemetry should be emitted, false otherwise.
   */
  return cycleDef === null || cycleDef === undefined || !cycleDef.emitsOwnTelemetry;
}

export function buildSuppressedOuterTelemetryResult(reason) {
  /**
   * Build suppressed outer telemetry result object.
   *
   * @param {string} reason - Reason for suppressing outer telemetry.
   * @returns {object} Suppressed outer telemetry result object.
   */
  return {
    suppressed: true,
    suppression_reason: reason || "emits_own_telemetry",
    written: false,
  };
}

export function shouldSkipOuterEmit(def) {
  /**
   * Alias for !shouldEmitOuterTelemetry(def).
   *
   * @param {object} def - Cycle definition object.
   * @returns {boolean} True when outer should be skipped.
   */
  return !shouldEmitOuterTelemetry(def);
}