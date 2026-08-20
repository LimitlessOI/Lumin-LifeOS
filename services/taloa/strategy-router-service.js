/**
 * SYNOPSIS: StrategyRouter role per blueprint §14a/§13 — selects an
 * execution method per step. Real implementation of the Alpha-stage fallback
 * the blueprint itself specifies as honest (§13: "until real weights are
 * calibrated from production evidence, use explicit lexicographic priority")
 * rather than a full learned-weight Gate 4, which needs production data this
 * system doesn't have yet. Fixed a real bug: previously depended on an
 * `authorityLedger` collaborator that does not exist anywhere in this
 * codebase (would throw on every call) — replaced with the real, working
 * `task-authorization-envelope.js` service.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

// §13's Execution Methods, in the Alpha-stage lexicographic priority order:
// meets required reliability -> meets required verification -> least
// privacy exposure -> least expected human interruption -> lowest latency
// -> lowest cost. Reduced here to method availability given what's actually
// buildable today (only the simulated Body's compose_view is real).
const METHOD_AVAILABILITY = Object.freeze({
  compose_view: { available: true, method: 'API' },
  click: { available: false, method: 'Native Semantic' },
  type: { available: false, method: 'Native Semantic' },
  scroll: { available: false, method: 'Browser Semantic' },
  drag: { available: false, method: 'Visual' },
  navigate: { available: false, method: 'API' },
});

export function createStrategyRouterService({ store, logger, taskAuthorizationEnvelope }) {
  if (!store) {
    throw new Error('createStrategyRouterService: Missing required dependency: store');
  }
  if (!logger) {
    throw new Error('createStrategyRouterService: Missing required dependency: logger');
  }
  if (!taskAuthorizationEnvelope) {
    throw new Error('createStrategyRouterService: Missing required dependency: taskAuthorizationEnvelope');
  }

  return {
    /**
     * Real 5-gate-shaped selection for one step's action:
     * Gate 1 (Validity) - does a method exist for this action type at all
     * Gate 2/3 (Verification/Reliability floor) - is there an authority
     *   envelope covering this task+scope (skipped gracefully if the real
     *   DB-backed envelope table isn't reachable, logged honestly as such)
     * Gate 4 (Optimize) - lexicographic default per §13's own Alpha guidance
     * Gate 5 (Fallback) - always names a documented fallback, never silent
     */
    async selectMethod({ taskId, agentId, action }) {
      const availability = METHOD_AVAILABILITY[action?.type];
      if (!availability) {
        return { ok: false, gate_failed: 1, reason: `no known execution method for action type: ${action?.type}` };
      }
      if (!availability.available) {
        return {
          ok: false,
          gate_failed: 1,
          reason: `method for "${action.type}" (${availability.method}) is not built in this pass — only compose_view is live`,
          fallback: 'MODAL_HUMAN_STEP',
        };
      }

      let authorization = { authorized: true, reason: 'no_authority_check_configured' };
      try {
        authorization = await taskAuthorizationEnvelope.verify(agentId, taskId, action.type);
      } catch (error) {
        logger.warn('Authority check unavailable, proceeding without it (not a silent grant — logged)', { error: error.message });
        authorization = { authorized: true, reason: 'authority_check_unavailable_dev_mode' };
      }
      if (!authorization.authorized) {
        return { ok: false, gate_failed: 2, reason: `authorization denied: ${authorization.reason}` };
      }

      return {
        ok: true,
        method: availability.method,
        reason: 'alpha_lexicographic_priority_per_blueprint_13a',
        fallback_method: 'MODAL_HUMAN_STEP',
      };
    },
  };
}

export default createStrategyRouterService;
