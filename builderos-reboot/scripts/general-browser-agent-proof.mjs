/**
 * SYNOPSIS: Proof for the general goal-driven browser agent core
 * (services/general-browser-agent.js). Runs the observe->decide->act loop with
 * deterministic stubs (no real browser, no real model) to prove the Chair's
 * non-negotiable guardrail: a live action never fires unless the account/site is
 * confirmed, and "done" only counts when the goal is independently evidenced from
 * real page state — otherwise fail-closed with no template captured.
 *
 * Run: node builderos-reboot/scripts/general-browser-agent-proof.mjs
 *
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import {
  runBrowserGoal,
  normalizeAction,
  isLiveAction,
} from '../../services/general-browser-agent.js';

let passed = 0;
const ok = (name) => { console.log(`  ok - ${name}`); passed += 1; };

// 1. normalizeAction rejects malformed actions, accepts valid ones.
assert.equal(normalizeAction({ type: 'frobnicate' }).ok, false);
assert.equal(normalizeAction({ type: 'navigate' }).ok, false);
assert.equal(normalizeAction({ type: 'click' }).ok, false);
assert.equal(normalizeAction({ type: 'type', selector: '#q' }).ok, false);
assert.equal(normalizeAction({ type: 'type', selector: '#q', text: 'x' }).ok, true);
assert.equal(normalizeAction({ type: 'click', target: 'Login' }).action.selector, 'Login');
ok('normalizeAction validates + normalizes decider output');

// 2. isLiveAction guards mutating actions only.
assert.equal(isLiveAction('navigate'), true);
assert.equal(isLiveAction('click'), true);
assert.equal(isLiveAction('type'), true);
assert.equal(isLiveAction('done'), false);
assert.equal(isLiveAction('wait'), false);
ok('isLiveAction flags navigate/click/type as live');

// 3. HAPPY PATH: multi-step goal reaches done + verified -> template captured.
{
  const acted = [];
  const script = [
    { type: 'type', selector: '#mls', text: '123', reason: 'enter listing number' },
    { type: 'click', selector: 'Search', reason: 'run search' },
    { type: 'done', reason: 'activity table visible' },
  ];
  let idx = 0;
  const res = await runBrowserGoal({
    goal: 'find listing activity',
    expectedContext: { account: 'adam', site: 'glvar' },
    observe: async () => ({ url: 'https://glvar.example/listing', account: 'adam', site: 'glvar', text: 'GLVAR listing', elements: [] }),
    decideAction: async () => script[idx++],
    act: async (a) => { acted.push(a); return { ok: true }; },
    verifyGoal: async () => ({ reached: true, evidence: { rows: 7, source: 'observed_dom' } }),
    confirmContext: async ({ observation, expectedContext }) => ({
      ok: observation.account === expectedContext.account && observation.site === expectedContext.site,
    }),
  });
  assert.equal(res.ok, true);
  assert.equal(res.reached, true);
  assert.equal(res.reason, 'goal_verified');
  assert.deepEqual(res.evidence, { rows: 7, source: 'observed_dom' });
  assert.equal(acted.length, 2, 'exactly the two live actions executed (done is not executed)');
  assert.equal(res.template.steps.length, 2, 'template captured the 2 live steps');
  assert.equal(res.template.site, 'glvar');
  ok('happy path: goal verified, template captured, only live actions executed');
}

// 4. FAIL-CLOSED: decider says done but real page state does NOT prove it.
{
  const res = await runBrowserGoal({
    goal: 'find listing activity',
    observe: async () => ({ url: 'https://glvar.example', text: 'error page', elements: [] }),
    decideAction: async () => ({ type: 'done', reason: 'i think it worked' }),
    act: async () => ({ ok: true }),
    verifyGoal: async () => ({ reached: false, evidence: { rows: 0, source: 'observed_dom' } }),
  });
  assert.equal(res.ok, false);
  assert.equal(res.reached, false);
  assert.equal(res.reason, 'goal_unverified');
  assert.equal(res.template, null, 'no template persisted on unverified success');
  ok('fail-closed: self-reported done without evidence => goal_unverified, no template');
}

// 5. GUARDRAIL: wrong account/site halts BEFORE any live action fires.
{
  const acted = [];
  const res = await runBrowserGoal({
    goal: 'draft an offer',
    expectedContext: { account: 'adam', site: 'transactiondesk' },
    observe: async () => ({ url: 'https://td.example', account: 'someone_else', site: 'transactiondesk', elements: [] }),
    decideAction: async () => ({ type: 'click', selector: 'Submit Offer' }),
    act: async (a) => { acted.push(a); return { ok: true }; },
    verifyGoal: async () => ({ reached: true }),
    confirmContext: async ({ observation, expectedContext }) => ({
      ok: observation.account === expectedContext.account,
      reason: 'account_mismatch',
    }),
  });
  assert.equal(res.ok, false);
  assert.match(res.reason, /context_unconfirmed:account_mismatch/);
  assert.equal(acted.length, 0, 'no live action executed on the wrong account');
  ok('guardrail: wrong account halts before any live action');
}

// 6. MALFORMED action is skipped (not sent to the browser), loop continues.
{
  const acted = [];
  const script = [
    { type: 'navigate' },                 // malformed: no url -> skipped
    { type: 'click', selector: 'Go' },    // valid
    { type: 'done' },
  ];
  let idx = 0;
  const res = await runBrowserGoal({
    goal: 'proceed',
    observe: async () => ({ url: 'https://x.example', elements: [] }),
    decideAction: async () => script[idx++],
    act: async (a) => { acted.push(a); return { ok: true }; },
    verifyGoal: async () => ({ reached: true, evidence: { ok: true } }),
  });
  assert.equal(res.ok, true);
  assert.equal(acted.length, 1, 'only the valid click executed; malformed navigate was skipped');
  assert.equal(acted[0].type, 'click');
  ok('malformed action is skipped, never reaches the browser');
}

// 7. MAX STEPS: a loop that never finishes stops fail-closed at the cap.
{
  const res = await runBrowserGoal({
    goal: 'never done',
    observe: async () => ({ url: 'https://x.example', elements: [] }),
    decideAction: async () => ({ type: 'wait', reason: 'spin' }),
    act: async () => ({ ok: true }),
    verifyGoal: async () => ({ reached: true }),
    maxSteps: 5,
  });
  assert.equal(res.ok, false);
  assert.match(res.reason, /max_steps_exhausted:5/);
  ok('max steps exhausted halts fail-closed');
}

// 8. GIVE_UP is honored and produces no template.
{
  const res = await runBrowserGoal({
    goal: 'blocked by captcha',
    observe: async () => ({ url: 'https://x.example', elements: [] }),
    decideAction: async () => ({ type: 'give_up', reason: 'captcha' }),
    act: async () => ({ ok: true }),
    verifyGoal: async () => ({ reached: true }),
  });
  assert.equal(res.ok, false);
  assert.match(res.reason, /gave_up:captcha/);
  assert.equal(res.template, null);
  ok('give_up honored, no template');
}

console.log(`\nAll ${passed} general-browser-agent proofs passed.`);
