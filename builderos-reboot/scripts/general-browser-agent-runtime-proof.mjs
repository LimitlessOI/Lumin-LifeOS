/**
 * SYNOPSIS: Behavioral proof for services/general-browser-agent-runtime.js.
 * Conductor-authored PROOF (SO-001 allows Devin to write proofs/assertions).
 * Exercises every exported adapter against a fake browser session + fake model —
 * no real Chrome, no real network. This is the behavioral gate the cheap-hands
 * codegen output must pass before the conductor commits it. If a proof fails,
 * re-run the governed factory (factory-author-local.mjs) with a stronger spec so
 * the cheap hands fix the code — do NOT hand-fix the module.
 *
 * Run: node builderos-reboot/scripts/general-browser-agent-runtime-proof.mjs
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import assert from 'node:assert';
import {
  observePage, formatObservation, parseModelAction, makeDecider,
  makeEvidenceVerifier, makeAccountConfirmer, executeAction,
} from '../../services/general-browser-agent-runtime.js';

let passed = 0;
function ok(name, cond) {
  if (!cond) { console.error(`✗ ${name}`); throw new Error(`PROOF FAILED: ${name}`); }
  console.log(`✓ ${name}`); passed += 1;
}

function fakeSession() {
  const calls = [];
  return {
    calls,
    page: {
      url: () => 'https://site.example/listing/123',
      title: async () => 'Listing 123',
      evaluate: async (fn, maxElements) => [
        { tag: 'a', type: '', name: '', id: 'activity', text: 'View Activity', selector: '#activity' },
        { tag: 'button', type: 'submit', name: 'go', id: '', text: 'Search', selector: 'button:nth-of-type(1)' },
      ],
    },
    currentUrl: async () => 'https://site.example/listing/123',
    pageText: async () => 'Activity report: 42 showings recorded for this listing.',
    navigate: async (url) => { calls.push(['navigate', url]); },
    click: async (sel) => { calls.push(['click', sel]); },
    fill: async (sel, text) => { calls.push(['fill', sel, text]); },
  };
}

async function main() {
  // 1. observePage returns a well-formed observation (catches the const-scope bug)
  const session = fakeSession();
  const obs = await observePage(session, { maxTextChars: 4000, maxElements: 40 });
  ok('observePage returns url', obs && obs.url === 'https://site.example/listing/123');
  ok('observePage returns title', obs.title === 'Listing 123');
  ok('observePage returns text', typeof obs.text === 'string' && obs.text.includes('42 showings'));
  ok('observePage returns elements array', Array.isArray(obs.elements) && obs.elements.length === 2);

  // 2. observePage never throws even when page.evaluate blows up
  const broken = fakeSession();
  broken.page.evaluate = async () => { throw new Error('evaluate boom'); };
  const obs2 = await observePage(broken);
  ok('observePage fails soft to empty elements', Array.isArray(obs2.elements) && obs2.elements.length === 0);

  // 3. formatObservation is a compact string mentioning the goal + a selector
  const text = formatObservation(obs, 'pull listing activity');
  ok('formatObservation includes goal', typeof text === 'string' && text.includes('pull listing activity'));
  ok('formatObservation includes a selector', text.includes('#activity'));

  // 4. parseModelAction handles clean JSON, prose-wrapped JSON, and garbage
  ok('parseModelAction clean json', parseModelAction('{"type":"click","selector":"#activity"}').type === 'click');
  ok('parseModelAction prose-wrapped', parseModelAction('Sure! {"type":"navigate","url":"https://x"} done').type === 'navigate');
  ok('parseModelAction garbage → give_up', parseModelAction('no json here').type === 'give_up');

  // 5. makeDecider escalates past a failing tier and parses the action
  const decide = makeDecider({
    tiers: ['cheap', 'mid'],
    callModel: async (tier) => {
      if (tier === 'cheap') throw new Error('tier down');
      return '{"type":"click","selector":"#activity"}';
    },
  });
  const action = await decide({ goal: 'g', observation: obs, history: [] });
  ok('makeDecider escalates + returns action', action.type === 'click' && action.selector === '#activity');

  const decideAllFail = makeDecider({ tiers: ['a'], callModel: async () => { throw new Error('down'); } });
  const gaveUp = await decideAllFail({ goal: 'g', observation: obs, history: [] });
  ok('makeDecider all tiers fail → give_up', gaveUp.type === 'give_up');

  // 6. makeEvidenceVerifier only reports what is present (no fabrication)
  const verify = makeEvidenceVerifier({ mustContain: ['42 showings'], mustHaveSelector: ['#activity'] });
  const good = await verify({ goal: 'g', observation: obs });
  ok('verifier reached when evidence present', good.reached === true);
  const verifyMiss = makeEvidenceVerifier({ mustContain: ['no such text'] });
  const bad = await verifyMiss({ goal: 'g', observation: obs });
  ok('verifier not reached when evidence absent', bad.reached === false);

  // 7. makeAccountConfirmer gates on host + account text
  const confirm = makeAccountConfirmer({ expectSiteHost: 'site.example', expectAccountText: '42 showings' });
  ok('confirmer ok on match', (await confirm({ observation: obs })).ok === true);
  const confirmBad = makeAccountConfirmer({ expectSiteHost: 'other.host' });
  ok('confirmer rejects wrong host', (await confirmBad({ observation: obs })).ok === false);

  // 8. executeAction drives the session primitives + fails soft
  const s = fakeSession();
  ok('executeAction navigate', (await executeAction(s, { type: 'navigate', url: 'https://x' })).ok === true);
  ok('executeAction click', (await executeAction(s, { type: 'click', selector: '#activity' })).ok === true);
  ok('executeAction type', (await executeAction(s, { type: 'type', selector: '#q', text: 'hi' })).ok === true);
  ok('executeAction done is noop', (await executeAction(s, { type: 'done' })).noop === true);
  ok('executeAction records primitive calls', s.calls.length === 3 && s.calls[0][0] === 'navigate');
  const sFail = fakeSession();
  sFail.click = async () => { throw new Error('click boom'); };
  ok('executeAction fails soft', (await executeAction(sFail, { type: 'click', selector: '#x' })).ok === false);

  console.log(`\nAll ${passed} runtime proofs passed.`);
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
