/**
 * SYNOPSIS: Behavioral proof for services/general-browser-agent-live.js.
 * Conductor-authored PROOF (SO-001). Exercises runGoalOnSession against a fake
 * browser session + a scripted fake model — no real Chrome, no real network, no
 * real GLVAR. Proves the orchestration wires the milestone-1 loop to the runtime
 * adapters correctly: observe→decide→act→verify, screenshots captured per step,
 * template emitted on verified success, fail-closed on unproven 'done'.
 *
 * Run: node builderos-reboot/scripts/general-browser-agent-live-proof.mjs
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import { runGoalOnSession } from '../../services/general-browser-agent-live.js';

let passed = 0;
function ok(name, cond) {
  if (!cond) { console.error(`✗ ${name}`); throw new Error(`PROOF FAILED: ${name}`); }
  console.log(`✓ ${name}`); passed += 1;
}

function fakeSession(pageTextByStep) {
  let step = 0;
  const calls = [];
  const shots = [];
  return {
    calls, shots,
    page: {
      url: () => 'https://glvar.example/listings',
      title: async () => 'GLVAR Listings',
      evaluate: async () => [{ tag: 'a', type: '', name: '', id: 'lst', text: '1160 Strada Cristallo', selector: '#lst' }],
    },
    currentUrl: async () => 'https://glvar.example/listings',
    pageText: async () => pageTextByStep[Math.min(step, pageTextByStep.length - 1)],
    navigate: async (url) => { calls.push(['navigate', url]); step += 1; },
    click: async (sel) => { calls.push(['click', sel]); step += 1; },
    fill: async (sel, t) => { calls.push(['fill', sel, t]); step += 1; },
    screenshot: async (label) => { const p = `/tmp/${label}.png`; shots.push(p); return p; },
  };
}

async function main() {
  // Model script: click the listing, then declare done. Page text reveals the
  // activity right AFTER the click (session step advances 0→1 on the click), so
  // the 'done' at the next observe is independently verifiable.
  const session = fakeSession([
    'GLVAR portal. My Listings.',
    '1160 Strada Cristallo — Activity: 42 showings, impressions this week.',
  ]);
  const actions = ['{"type":"click","selector":"#lst"}', '{"type":"done"}'];
  let i = 0;
  const callModel = async (_tier, _prompt) => actions[Math.min(i++, actions.length - 1)];

  const result = await runGoalOnSession({
    session,
    goal: 'find the listing and read its activity',
    callModel,
    tiers: ['cheap', 'mid'],
    mustContain: ['42 showings'],
    expectSiteHost: 'glvar.example',
    maxSteps: 6,
  });

  ok('reached goal', result.reached === true && result.ok === true);
  ok('reason is goal_verified', result.reason === 'goal_verified');
  ok('evidence includes the matched text', JSON.stringify(result.evidence).includes('42 showings'));
  ok('template captured with steps', result.template && Array.isArray(result.template.steps) && result.template.steps.length >= 1);
  ok('drove the real click primitive', session.calls.some((c) => c[0] === 'click' && c[1] === '#lst'));
  ok('captured a screenshot per step', session.shots.length >= 2);

  // Fail-closed: model says done but the page never shows the evidence.
  const s2 = fakeSession(['nothing relevant here', 'still nothing']);
  let j = 0;
  const doneNow = async () => (['{"type":"done"}'][Math.min(j++, 0)]);
  const bad = await runGoalOnSession({
    session: s2, goal: 'read activity', callModel: doneNow, tiers: ['cheap'],
    mustContain: ['42 showings'], maxSteps: 3,
  });
  ok('fails closed when evidence absent', bad.reached === false && bad.reason === 'goal_unverified');
  ok('no template on unproven done', bad.template === null);

  console.log(`\nAll ${passed} live-orchestration proofs passed.`);
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
