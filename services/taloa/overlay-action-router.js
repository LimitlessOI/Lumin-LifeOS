/**
 * SYNOPSIS: TALOA-A2Z-003 -- bounded multi-tree action router. Plans an
 * action against a selected target, then executes it through an ordered
 * fallback of control trees: dom (extension-drive accessibility/DOM control,
 * services/extension-drive-bridge.js), browser (Chrome-level automation),
 * app (app-specific hook, e.g. the ChatGPT adapter), visual (native macOS
 * ScreenControl coordinate click/type via the Taloa overlay command
 * channel), keyboard (keyboard-only fallback). Adapters are injected, not
 * hardcoded, so this stays testable without a live session. No silent
 * success: a tree that isn't wired or returns ok:false is a real failure,
 * not skipped-and-forgotten.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const TREE_ORDER = ['dom', 'browser', 'app', 'visual', 'keyboard'];

const RISKY_ACTION_TYPES = new Set(['submit', 'navigate', 'refresh']);

const SUPPORTED_ACTIONS = new Set([
  'click', 'tap', 'press', 'focus', 'type', 'select', 'scroll',
  'navigate', 'submit', 'wait', 'switch_target', 'back', 'forward', 'refresh',
]);

export function createOverlayActionRouter() {
  function plan(action, target, context = {}) {
    const type = String(action?.type || '').trim();
    if (!SUPPORTED_ACTIONS.has(type)) {
      return { ok: false, error: `unsupported_action_type: ${type}` };
    }
    const requiresAuthorization = RISKY_ACTION_TYPES.has(type) || action?.risky === true;
    if (requiresAuthorization && !context.authorized) {
      return { ok: false, error: 'risky_action_requires_authorization', action_type: type };
    }
    return {
      ok: true,
      plan: {
        type,
        target: target || null,
        value: action?.value ?? action?.text ?? null,
        authorized: !!context.authorized,
        trees: Array.isArray(context.treeOrder) ? context.treeOrder : TREE_ORDER,
        planned_at: new Date().toISOString(),
      },
    };
  }

  async function execute(planResult, adapters = {}) {
    if (!planResult?.ok) {
      return { ok: false, tree: null, error: planResult?.error || 'invalid_plan' };
    }
    const { plan: p } = planResult;
    const attempts = [];

    for (const tree of p.trees) {
      const adapter = adapters[tree];
      if (typeof adapter !== 'function') {
        attempts.push({ tree, ok: false, error: 'adapter_not_wired' });
        continue;
      }
      try {
        const result = await adapter(p);
        attempts.push({ tree, ok: !!result?.ok, error: result?.ok ? null : result?.error || 'adapter_reported_failure' });
        if (result?.ok) {
          return { ok: true, tree, result, attempts };
        }
      } catch (err) {
        attempts.push({ tree, ok: false, error: err.message });
      }
    }

    return { ok: false, tree: null, error: 'all_trees_exhausted', attempts };
  }

  return { plan, execute };
}

export default { createOverlayActionRouter };
