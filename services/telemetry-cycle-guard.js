/**
 * SYNOPSIS: Telemetry cycle context guard — Phase 02 of BuilderOS production autonomy roadmap.
 * Telemetry cycle context guard — Phase 02 of BuilderOS production autonomy roadmap.
 *
 * Pure helper functions for standardizing sessionId/cycleId propagation and
 * controlling outer vs inner telemetry emit logic. No DB writes, no AI calls,
 * no imports from other services.
 *
 * Used by Phase 03 to patch autonomous-telemetry-session.js without large-file surgery.
 *
 * GAP-FILL repair: builder (groq_llama) committed version where hasTelemetryCycleContext
 * returned true for { sessionId: undefined } and {} — undefined values not caught by
 * != null or !== '' checks. Fixed with typeof === 'string' guards.
 * JSDoc was also inside function bodies; moved to correct position.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Normalize telemetry cycle context from an arbitrary input object.
 * Does NOT mutate input. Returns a fresh object with guaranteed fields.
 *
 * @param {object|null|undefined} input
 * @returns {{ sessionId: string|null, cycleId: string|null, hasSession: boolean }}
 */
export function normalizeTelemetryCycleContext(input) {
  if (input == null) {
    return { sessionId: null, cycleId: null, hasSession: false };
  }
  const sessionId = (typeof input.sessionId === 'string' && input.sessionId.length > 0)
    ? input.sessionId
    : null;
  const cycleId = (typeof input.cycleId === 'string' && input.cycleId.length > 0)
    ? input.cycleId
    : null;
  return { sessionId, cycleId, hasSession: sessionId !== null && cycleId !== null };
}

/**
 * Returns true if input has both a non-empty sessionId AND a non-empty cycleId string.
 * Safe for null, undefined, or objects missing those fields.
 *
 * @param {object|null|undefined} input
 * @returns {boolean}
 */
export function hasTelemetryCycleContext(input) {
  if (input == null) return false;
  return typeof input.sessionId === 'string' && input.sessionId.length > 0
    && typeof input.cycleId === 'string' && input.cycleId.length > 0;
}

/**
 * Returns true when the outer session loop SHOULD emit telemetry for this cycle.
 * Returns false when the cycle def declares it emits its own telemetry internally
 * (emitsOwnTelemetry === true), meaning the outer emit would duplicate it.
 *
 * Safe for null/undefined cycleDef — defaults to true (emit).
 *
 * @param {{ emitsOwnTelemetry?: boolean }|null|undefined} cycleDef
 * @returns {boolean}
 */
export function shouldEmitOuterTelemetry(cycleDef) {
  if (cycleDef == null) return true;
  return cycleDef.emitsOwnTelemetry !== true;
}

/**
 * Inverse of shouldEmitOuterTelemetry. Returns true when the outer emit should be SKIPPED.
 * Alias exported for Phase 03 import convenience.
 *
 * @param {{ emitsOwnTelemetry?: boolean }|null|undefined} def
 * @returns {boolean}
 */
export function shouldSkipOuterEmit(def) {
  return !shouldEmitOuterTelemetry(def);
}

/**
 * Builds a marker object to return in place of a real telemetry emit result
 * when the outer emit has been intentionally suppressed.
 *
 * @param {string} [reason] - Why the outer emit was suppressed.
 * @returns {{ suppressed: true, suppression_reason: string, written: false }}
 */
export function buildSuppressedOuterTelemetryResult(reason) {
  return {
    suppressed: true,
    suppression_reason: reason || 'emits_own_telemetry',
    written: false,
  };
}
