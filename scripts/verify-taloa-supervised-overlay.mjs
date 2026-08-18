#!/usr/bin/env node
/**
 * SYNOPSIS: Behavioral regression proof for the supervised live-overlay adapter.
 * Uses two isolated injected transports so it proves the adapter itself without
 * requiring the founder's real browser during CI.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import { createOverlayExtensionDriveRuntime } from '../services/taloa/overlay-extension-drive-runtime.js';

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) console.error(`FAIL ${name}: ${detail}`);
}

function makeHarness(label) {
  let text = '';
  let url = `https://example.com/${label}`;
  const actions = [];
  const snapshot = () => ({
    url,
    title: `Work ${label}`,
    elements: [
      { tag: 'textarea', type: 'text', selector: `#composer-${label}`, text },
      { tag: 'button', type: 'submit', selector: `#send-${label}`, text: 'Send' },
    ],
  });
  return {
    actions,
    observeRaw: async () => snapshot(),
    actRaw: async (action) => {
      actions.push(action);
      if (action.type === 'type') text = action.text;
      if (action.type === 'click') text = `${text}:clicked`;
      if (action.type === 'navigate') url = action.url;
      return { ok: true };
    },
  };
}

async function run() {
  const a = makeHarness('a');
  const b = makeHarness('b');
  const runtimeA = createOverlayExtensionDriveRuntime(a);
  const runtimeB = createOverlayExtensionDriveRuntime(b);

  const obsA = await runtimeA.observe();
  check('observe_real_shape', obsA.scene.page_identity.url.endsWith('/a') && Array.isArray(obsA.scene.actionable));

  const typedA = await runtimeA.executeSupervisedAction({
    action: { type: 'type', selector: '#composer-a', text: 'proposal A' },
    authorized: true,
  });
  check('type_executes_through_dom_adapter', a.actions[0]?.type === 'type' && a.actions[0]?.text === 'proposal A', JSON.stringify(a.actions[0]));
  check('type_requires_observed_effect_for_verified', typedA.state === 'VERIFIED', typedA.state);

  const stillB = await runtimeB.observe();
  check('parallel_session_state_isolated', stillB.scene.composer?.text === '', JSON.stringify(stillB.scene.composer));

  const typedB = await runtimeB.executeSupervisedAction({
    action: { type: 'type', selector: '#composer-b', text: 'proposal B' },
    authorized: true,
  });
  check('second_session_advances_independently', typedB.state === 'VERIFIED' && b.actions[0]?.text === 'proposal B', typedB.state);
  check('first_session_not_contaminated', a.actions.length === 1 && b.actions.length === 1, `a=${a.actions.length},b=${b.actions.length}`);

  const nav = await runtimeA.executeSupervisedAction({
    action: { type: 'navigate', url: 'https://example.com/next' },
    authorized: true,
    acceptance: { expectUrlContains: '/next' },
  });
  check('navigate_translation_preserves_url', a.actions.at(-1)?.url === 'https://example.com/next', JSON.stringify(a.actions.at(-1)));
  check('navigate_verified_from_fresh_observation', nav.state === 'VERIFIED', nav.state);

  const routeSource = fs.readFileSync(new URL('../routes/taloa-supervised-overlay-routes.js', import.meta.url), 'utf8');
  check('route_requires_explicit_founder_approval', routeSource.includes("founder_approval_required") && routeSource.includes('founderApproved !== true'));
  check('route_exposes_work_item_inventory', routeSource.includes("router.get('/work-items'"));
  check('route_uses_supervised_mode_not_legacy_autonomous_loop', !routeSource.includes('runBrowserGoal('));

  const failures = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ ok: failures.length === 0, passed: checks.length - failures.length, failed: failures.length, checks }, null, 2));
  process.exit(failures.length ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
