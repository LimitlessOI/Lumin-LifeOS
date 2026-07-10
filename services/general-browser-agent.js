/**
 * SYNOPSIS: General goal-driven browser agent — the loop that lets the system
 * operate an ARBITRARY website like a human instead of a hand-written selector
 * script per site. Given a goal, it observes the live page, asks a (cheapest-tier
 * first) model for the next action, executes it against the real browser, and
 * repeats until a goal-proof condition is independently met. On success it emits a
 * reusable template ({ site, goal, ordered steps }) so future runs can replay the
 * path cheaply and only fall back to the AI loop if the site changed.
 *
 * Chair consensus: live council receipt LIFERE_COUNCIL_1783455558829 approved this
 * design + sequencing (loop -> template capture -> replay-first) with ONE
 * non-negotiable guardrail: never take a live action unless the current page state
 * is observed AND the intended account/site is confirmed, and success must be
 * independently evidenced (real observed page state, never self-reported) before a
 * template is persisted. SENTRY proves goal completion from that evidence.
 *
 * FACTORY-CLEAN CORE. Every side effect is injected (observe, decideAction, act,
 * verifyGoal, confirmContext, onStep) so this loop is unit-testable with no real
 * browser and no real model. The browser + model adapters live in
 * services/general-browser-agent-runtime.js.
 *
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */

/** Actions the decider may return. `done` triggers independent goal verification. */
export const BROWSER_ACTIONS = Object.freeze(['navigate', 'click', 'type', 'wait', 'done', 'give_up']);

export class BrowserAgentError extends Error {}

function assertFn(fn, name) {
  if (typeof fn !== 'function') throw new BrowserAgentError(`runBrowserGoal requires an injected ${name} fn`);
}

/**
 * Normalize + validate a decider action so a hallucinated/garbage action can never
 * reach the real browser as a live mutation.
 */
export function normalizeAction(raw) {
  const action = raw && typeof raw === 'object' ? raw : {};
  const type = String(action.type || '').trim().toLowerCase();
  if (!BROWSER_ACTIONS.includes(type)) {
    return { ok: false, reason: `unknown_action:${type || 'empty'}` };
  }
  if (type === 'navigate' && !String(action.url || '').trim()) {
    return { ok: false, reason: 'navigate_requires_url' };
  }
  if (type === 'click' && !String(action.selector || action.target || '').trim()) {
    return { ok: false, reason: 'click_requires_target' };
  }
  if (type === 'type' && (!String(action.selector || action.target || '').trim() || action.text == null)) {
    return { ok: false, reason: 'type_requires_target_and_text' };
  }
  return {
    ok: true,
    action: {
      type,
      url: action.url != null ? String(action.url) : undefined,
      selector: (action.selector || action.target) != null ? String(action.selector || action.target) : undefined,
      text: action.text != null ? String(action.text) : undefined,
      reason: action.reason != null ? String(action.reason) : undefined,
    },
  };
}

/**
 * Whether an action mutates live state (needs the account/site guardrail).
 * navigate/click/type can all change server-side state, so all are guarded.
 * `wait`/`done`/`give_up` are read-only/terminal and are not guarded.
 */
export function isLiveAction(type) {
  return type === 'navigate' || type === 'click' || type === 'type';
}

/**
 * Run a goal on a live browser via the observe -> decide -> act loop.
 *
 * @param {object} opts
 * @param {string}   opts.goal                    plain-language goal
 * @param {string}   [opts.startUrl]              initial navigation (guarded like any action)
 * @param {object}   [opts.expectedContext]       { account, site } the run MUST stay within
 * @param {Function} opts.observe                 async () -> { url, title, text, elements[], screenshot }
 * @param {Function} opts.decideAction            async ({ goal, observation, history }) -> raw action
 * @param {Function} opts.act                     async (action) -> { ok, detail }
 * @param {Function} opts.verifyGoal              async ({ goal, observation }) -> { reached:boolean, evidence }
 * @param {Function} [opts.confirmContext]        async ({ observation, expectedContext }) -> { ok, reason }
 * @param {Function} [opts.onStep]                async (stepRecord) -> void  (Historian sink)
 * @param {Function} [opts.onAfterStep]           async ({ observation, step }) -> { stop?, reason?, ok?, handoff? }
 * @param {number}   [opts.maxSteps]              hard cap (cost/safety), default 25
 * @returns {Promise<{ ok, reached, reason, steps, evidence, template, handoff? }>}
 */
export async function runBrowserGoal(opts = {}) {
  const {
    goal,
    startUrl = null,
    expectedContext = null,
    observe,
    decideAction,
    act,
    verifyGoal,
    confirmContext = null,
    onStep = null,
    onAfterStep = null,
    maxSteps = 25,
  } = opts;

  if (!String(goal || '').trim()) throw new BrowserAgentError('runBrowserGoal requires a goal');
  assertFn(observe, 'observe');
  assertFn(decideAction, 'decideAction');
  assertFn(act, 'act');
  assertFn(verifyGoal, 'verifyGoal');

  const steps = [];
  const templateSteps = [];

  const record = async (rec) => {
    steps.push(rec);
    if (onStep) await onStep(rec);
  };

  // GUARDRAIL: confirm we are on the intended account/site before a live action.
  const guard = async (observation, action) => {
    if (!isLiveAction(action.type)) return { ok: true };
    if (!confirmContext || !expectedContext) return { ok: true };
    const verdict = await confirmContext({ observation, expectedContext, action });
    if (!verdict || verdict.ok !== true) {
      return { ok: false, reason: `context_unconfirmed:${verdict?.reason || 'unknown'}` };
    }
    return { ok: true };
  };

  // Optional guarded start navigation.
  if (startUrl) {
    let observation = await observe();
    const g = await guard(observation, { type: 'navigate', url: startUrl });
    if (!g.ok) {
      await record({ step: 0, action: { type: 'navigate', url: startUrl }, blocked: true, reason: g.reason });
      return { ok: false, reached: false, reason: g.reason, steps, evidence: null, template: null };
    }
    const res = await act({ type: 'navigate', url: startUrl });
    await record({ step: 0, action: { type: 'navigate', url: startUrl }, result: res });
    templateSteps.push({ type: 'navigate', url: startUrl });
  }

  for (let i = 1; i <= maxSteps; i += 1) {
    const observation = await observe();

    if (typeof onAfterStep === 'function') {
      const after = await onAfterStep({ observation, step: i, history: steps });
      if (after?.stop) {
        await record({
          step: i,
          action: { type: 'done', reason: after.reason || 'onAfterStep_stop' },
          handoff: after.handoff || null,
        });
        return {
          ok: after.ok !== false,
          reached: false,
          reason: after.reason || 'onAfterStep_stop',
          steps,
          evidence: null,
          template: null,
          handoff: after.handoff || null,
        };
      }
    }

    const raw = await decideAction({ goal, observation, history: steps });
    const norm = normalizeAction(raw);

    if (!norm.ok) {
      await record({ step: i, raw, blocked: true, reason: norm.reason });
      // A malformed action is a decider miss, not a reason to touch the site — skip it.
      continue;
    }
    const action = norm.action;

    if (action.type === 'give_up') {
      await record({ step: i, action });
      return { ok: false, reached: false, reason: `gave_up:${action.reason || 'no_reason'}`, steps, evidence: null, template: null };
    }

    if (action.type === 'done') {
      const verdict = await verifyGoal({ goal, observation });
      const reached = verdict?.reached === true;
      await record({ step: i, action, verified: reached, evidence: verdict?.evidence ?? null });
      if (!reached) {
        // Fail-closed: decider claims done but real page state does not prove it.
        return { ok: false, reached: false, reason: 'goal_unverified', steps, evidence: verdict?.evidence ?? null, template: null };
      }
      const template = { site: expectedContext?.site ?? null, goal, steps: templateSteps, captured_at: new Date().toISOString() };
      return { ok: true, reached: true, reason: 'goal_verified', steps, evidence: verdict.evidence ?? null, template };
    }

    // navigate / click / type / wait
    const g = await guard(observation, action);
    if (!g.ok) {
      await record({ step: i, action, blocked: true, reason: g.reason });
      return { ok: false, reached: false, reason: g.reason, steps, evidence: null, template: null };
    }

    const res = await act(action);
    await record({ step: i, action, result: res });
    if (isLiveAction(action.type)) {
      templateSteps.push({ type: action.type, url: action.url, selector: action.selector, text: action.text });
    }
  }

  return { ok: false, reached: false, reason: `max_steps_exhausted:${maxSteps}`, steps, evidence: null, template: null };
}

export default { runBrowserGoal, normalizeAction, isLiveAction, BROWSER_ACTIONS, BrowserAgentError };
