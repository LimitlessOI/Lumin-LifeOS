/**
 * SYNOPSIS: Live supervised adapter between the Taloa A-to-Z pipeline and the
 * already-proven Universal Overlay extension-drive channel. This is the missing
 * integration layer: observations come from the founder's real browser tab,
 * actions execute through that same tab, and every mutation is followed by a
 * fresh observation + independent result-verifier pass.
 *
 * This module is intentionally session-scoped and stateless outside the existing
 * extension-drive bridge so multiple work items can coexist without sharing task
 * context. A caller may inject observeRaw/actRaw for deterministic tests.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import { makeExtensionObserve, makeExtensionAct } from '../extension-drive-bridge.js';
import { createOverlayObservationEngine } from './overlay-observation-engine.js';
import { createOverlayTargetSelector } from './overlay-target-selector.js';
import { createOverlayActionRouter } from './overlay-action-router.js';
import { createOverlayResultVerifier } from './overlay-result-verifier.js';

function bridgeActionFromPlan(plan) {
  const selector = plan?.target?.selector || null;
  switch (plan?.type) {
    case 'click':
    case 'tap':
    case 'press':
    case 'focus':
      if (!selector) return { ok: false, error: 'selector_required' };
      return { ok: true, action: { type: 'click', selector, reason: plan?.target?.label || undefined } };
    case 'type':
      if (!selector) return { ok: false, error: 'selector_required' };
      return { ok: true, action: { type: 'type', selector, text: String(plan?.value ?? '') } };
    case 'wait':
      return { ok: true, action: { type: 'wait', ms: Number(plan?.value) || 800 } };
    case 'navigate':
      if (!plan?.url) return { ok: false, error: 'navigate_requires_url' };
      return { ok: true, action: { type: 'navigate', url: plan.url } };
    default:
      return { ok: false, error: `extension_drive_unsupported_action:${plan?.type || 'unknown'}` };
  }
}

function actionNeedsTarget(type) {
  return ['click', 'tap', 'press', 'focus', 'type', 'select'].includes(type);
}

export function createOverlayExtensionDriveRuntime({
  sessionId = null,
  observeRaw = null,
  actRaw = null,
  observationEngine = createOverlayObservationEngine(),
  targetSelector = createOverlayTargetSelector(),
  actionRouter = createOverlayActionRouter(),
  resultVerifier = createOverlayResultVerifier(),
} = {}) {
  const observeTransport = observeRaw || (sessionId ? makeExtensionObserve(sessionId) : null);
  const actTransport = actRaw || (sessionId ? makeExtensionAct(sessionId) : null);

  if (typeof observeTransport !== 'function') throw new Error('overlay extension drive runtime requires observe transport');
  if (typeof actTransport !== 'function') throw new Error('overlay extension drive runtime requires act transport');

  async function observe() {
    const snapshot = await observeTransport();
    const scene = observationEngine.observe(snapshot || {});
    return { snapshot: snapshot || {}, scene };
  }

  async function executeSupervisedAction({ action = {}, authorized = false, acceptance = null } = {}) {
    const type = String(action?.type || '').trim().toLowerCase();
    const before = await observe();

    let target = null;
    if (actionNeedsTarget(type)) {
      const selected = targetSelector.select(before.scene, {
        selector: action.selector || null,
        label: action.label || action.reason || null,
        kind: type === 'type' ? 'type' : 'click',
      });
      if (!selected.ok) {
        return {
          ok: false,
          state: 'LOW_CONFIDENCE',
          blocker: selected,
          before: before.scene,
        };
      }
      target = selected.target;
    }

    const planned = actionRouter.plan({
      ...action,
      type,
      value: action.value ?? action.text ?? action.ms ?? null,
    }, target, { authorized });

    if (!planned.ok) {
      return { ok: false, state: 'PLAN_REJECTED', error: planned.error, before: before.scene };
    }

    const domAdapter = async (plan) => {
      const translated = bridgeActionFromPlan(plan);
      if (!translated.ok) return translated;
      return actTransport(translated.action);
    };

    const executed = await actionRouter.execute(planned, { dom: domAdapter });
    if (!executed.ok) {
      return {
        ok: false,
        state: 'ACTION_FAILED',
        error: executed.error,
        attempts: executed.attempts,
        before: before.scene,
      };
    }

    const after = await observe();
    const verdict = resultVerifier.verify({
      before: before.scene,
      plan: planned.plan,
      after: after.scene,
      acceptance,
    });

    return {
      ok: verdict.status === 'VERIFIED',
      state: verdict.status,
      plan: planned.plan,
      executed: { tree: executed.tree, attempts: executed.attempts },
      verdict,
      before: before.scene,
      after: after.scene,
    };
  }

  return { observe, executeSupervisedAction };
}

export default { createOverlayExtensionDriveRuntime };
