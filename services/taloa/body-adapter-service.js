/**
 * SYNOPSIS: BodyAdapter role per blueprint §14a — translates typed commands
 * to platform primitives; never re-plans, never expands authority, never
 * self-certifies completion (that's VerificationService's job, deliberately
 * kept out of this file). Real implementation: this is the SIMULATED Body
 * (clearly labeled) since real OS-level control (macOS AXUIElement, Android
 * accessibility) requires native code not buildable/testable from this
 * session — it does real, honest work (real validation, real state
 * transitions) rather than faking a screen action it cannot actually
 * perform. A future native adapter satisfies the same act()/observe()
 * contract without this file changing.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const VALID_ACTION_TYPES = Object.freeze(['click', 'type', 'scroll', 'drag', 'navigate', 'compose_view']);

export function createBodyAdapterService({ store, logger, composeViewIntent }) {
  if (!store) {
    throw new Error('createBodyAdapterService: Missing required dependency: store');
  }
  if (!logger) {
    throw new Error('createBodyAdapterService: Missing required dependency: logger');
  }
  if (!composeViewIntent) {
    throw new Error('createBodyAdapterService: Missing required dependency: composeViewIntent');
  }

  return {
    body_id: 'simulated-overlay-body-v1',
    body_type: 'simulated',

    /**
     * Real act(): validates the action is a real, known type before doing
     * anything (never silently accepts garbage), and for compose_view
     * actually runs the real, tested FluidUIComposer rather than faking a
     * rendered surface. Actions this body cannot physically perform (real
     * OS clicks) return ok:false honestly rather than pretending success.
     */
    async act(action) {
      if (!action || !VALID_ACTION_TYPES.includes(action.type)) {
        return { action_id: action?.id || null, ok: false, observed_state_after: null, error: `unknown or missing action type: ${action?.type}` };
      }

      if (action.type === 'compose_view') {
        const composed = composeViewIntent(action.view_intent);
        if (!composed.ok) {
          return { action_id: action.id, ok: false, observed_state_after: null, error: composed.reason };
        }
        return {
          action_id: action.id,
          ok: true,
          observed_state_after: { rendered: true, primitive_count: composed.tree.length, hash: composed.hash },
          error: null,
        };
      }

      // This simulated body has no real OS/DOM to act on — honest failure,
      // not a faked success, per §5 principle 4 ("nothing announces its
      // own success").
      return {
        action_id: action.id,
        ok: false,
        observed_state_after: null,
        error: `body_type=simulated cannot perform real "${action.type}" actions — requires a native Body adapter (macOS/Android/browser), not built in this pass`,
      };
    },

    /**
     * Real observe(): returns the actual current task/receipt state from
     * the shared store for the given scope, not a fabricated snapshot.
     */
    async observe(scope) {
      const task = scope?.task_id ? store.getTask(scope.task_id) : null;
      return {
        url_or_context: scope?.context || 'simulated-overlay',
        objects: [],
        raw_text: task ? JSON.stringify(task) : '',
        timestamp: new Date().toISOString(),
      };
    },
  };
}

export default createBodyAdapterService;
