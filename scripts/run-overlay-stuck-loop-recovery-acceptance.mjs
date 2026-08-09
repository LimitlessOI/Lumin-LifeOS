#!/usr/bin/env node
/**
 * SYNOPSIS: Overlay Stuck-Loop Recovery acceptance.
 * PASS = the real, live core loop detects a repeated no-op action, escalates
 * model tier when meaningfully stuck, and never false-positives on genuine
 * forward progress -- verified against the actual committed code, not mocks.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'OVERLAY-STUCK-LOOP-RECOVERY-0001';
const CORE = path.join(ROOT, 'services/general-browser-agent.js');
const RUNTIME = path.join(ROOT, 'services/general-browser-agent-runtime.js');
const BROWSER_AGENT = path.join(ROOT, 'services/browser-agent.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'OVERLAY_STUCK_LOOP_RECOVERY_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/OVERLAY_STUCK_LOOP_RECOVERY_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'overlay_stuck_loop_recovery_acceptance_v1',
  mission_id: MISSION,
  started_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  steps: [],
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
  (ok ? report.tests_passed : report.tests_failed).push(name);
}

function finish() {
  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'Overlay Stuck-Loop Recovery',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Generic stuck-detection + tier escalation + render-settle fix -- direct response to a real live Etsy signup run exhausting its step budget on a repeated no-op action.',
    },
    verdictExtra: {
      acceptance_command: 'npm run overlay:stuck-loop-recovery:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

step('core_engine_exists', fs.existsSync(CORE), CORE);
if (fs.existsSync(CORE)) {
  try {
    const mod = await import(`file://${CORE}?t=${Date.now()}`);
    step('exports_fingerprintObservation', typeof mod.fingerprintObservation === 'function', { exported: Object.keys(mod) });

    if (typeof mod.fingerprintObservation === 'function') {
      const fp1 = mod.fingerprintObservation({ url: 'https://x.com/a', title: 'A', elements: [{ tag: 'a', selector: '#x' }] });
      const fp2 = mod.fingerprintObservation({ url: 'https://x.com/a', title: 'A', elements: [{ tag: 'a', selector: '#x' }] });
      const fp3 = mod.fingerprintObservation({ url: 'https://x.com/b', title: 'B', elements: [{ tag: 'button', selector: '#y' }] });
      step('fingerprint_deterministic_same_state_same_print', fp1 === fp2, { fp1, fp2 });
      step('fingerprint_differs_on_different_state', fp1 !== fp3, { fp1, fp3 });
    }

    if (typeof mod.runBrowserGoal === 'function') {
      // Real behavioral proof: a decider that always proposes the SAME no-op click
      // must trigger stuck:true with a rising stuckCount by the 3rd identical
      // observation, and the loop must still honestly exhaust and report failure
      // (this mission is detection + escalation, not a guarantee of success).
      const stationaryObservation = { url: 'https://example.com/page', title: 'Same Page', text: '', elements: [{ selector: '#btn', text: 'Click Me' }] };
      const stuckFlags = [];
      let acted = 0;
      const stuckResult = await mod.runBrowserGoal({
        goal: 'do something',
        observe: async () => stationaryObservation,
        decideAction: async ({ stuck, stuckCount }) => {
          stuckFlags.push({ stuck, stuckCount });
          acted += 1;
          return { type: 'click', selector: '#btn' };
        },
        act: async () => ({ ok: true }),
        verifyGoal: async () => ({ reached: false }),
        maxSteps: 4,
      });
      step('first_iteration_never_flagged_stuck', stuckFlags[0]?.stuck === false, stuckFlags[0]);
      step('repeated_identical_observation_flags_stuck_with_rising_count',
        stuckFlags[1]?.stuck === true && stuckFlags[1]?.stuckCount === 1
          && stuckFlags[2]?.stuck === true && stuckFlags[2]?.stuckCount === 2,
        stuckFlags);
      step('loop_still_honestly_reports_exhaustion_not_fake_success',
        stuckResult.ok === false && String(stuckResult.reason || '').startsWith('max_steps_exhausted'),
        stuckResult);

      // Regression proof: genuinely differing observations must never false-positive.
      let call = 0;
      const progressFlags = [];
      const progressObservations = [
        { url: 'https://example.com/1', title: 'Page 1', text: '', elements: [{ selector: '#a', text: 'Next' }] },
        { url: 'https://example.com/2', title: 'Page 2', text: '', elements: [{ selector: '#b', text: 'Next' }] },
        { url: 'https://example.com/3', title: 'Page 3', text: '', elements: [{ selector: '#c', text: 'Done' }] },
      ];
      await mod.runBrowserGoal({
        goal: 'progress through pages',
        observe: async () => progressObservations[Math.min(call, progressObservations.length - 1)],
        decideAction: async ({ stuck }) => {
          progressFlags.push(stuck);
          call += 1;
          return call >= progressObservations.length ? { type: 'done' } : { type: 'click', selector: '#next' };
        },
        act: async () => ({ ok: true }),
        verifyGoal: async () => ({ reached: true, evidence: {} }),
        maxSteps: 5,
      });
      step('genuine_progress_never_false_positives_stuck', progressFlags.every((f) => f === false), progressFlags);
    }
  } catch (err) {
    step('core_engine_imports_and_behaves_correctly', false, { error: err.message, stack: err.stack });
  }
}

step('runtime_adapter_exists', fs.existsSync(RUNTIME), RUNTIME);
if (fs.existsSync(RUNTIME)) {
  try {
    const mod = await import(`file://${RUNTIME}?t=${Date.now()}`);
    step('formatObservation_includes_stuck_warning',
      typeof mod.formatObservation === 'function' && mod.formatObservation({ url: 'x', title: 't', text: '', elements: [] }, 'g', { stuck: true }).includes('WARNING'),
      'must append an explicit corrective note when stuck:true');
    step('formatObservation_no_warning_when_not_stuck',
      typeof mod.formatObservation === 'function' && !mod.formatObservation({ url: 'x', title: 't', text: '', elements: [] }, 'g', { stuck: false }).includes('WARNING'),
      'must not append the warning on normal turns');

    if (typeof mod.makeDecider === 'function') {
      const calls = [];
      const decide = mod.makeDecider({ callModel: async (tier) => { calls.push(tier); return null; }, tiers: ['cheap1', 'cheap2', 'strong'] });
      await decide({ goal: 'g', observation: { url: 'x', title: 't', text: '', elements: [] }, history: [], stuck: true, stuckCount: 2 });
      step('escalates_to_strongest_tier_first_when_meaningfully_stuck', calls[0] === 'strong', calls);

      calls.length = 0;
      await decide({ goal: 'g', observation: { url: 'x', title: 't', text: '', elements: [] }, history: [], stuck: false, stuckCount: 0 });
      step('normal_turns_still_try_cheapest_tier_first', calls[0] === 'cheap1', calls);
    }
  } catch (err) {
    step('runtime_adapter_imports_and_behaves_correctly', false, { error: err.message, stack: err.stack });
  }
}

step('browser_agent_exists', fs.existsSync(BROWSER_AGENT), BROWSER_AGENT);
if (fs.existsSync(BROWSER_AGENT)) {
  const src = fs.readFileSync(BROWSER_AGENT, 'utf8');
  step('navigate_has_settle_delay', /page\.goto\(url[\s\S]{0,600}setTimeout\(resolve,\s*1200\)/.test(src), 'navigate() must wait after goto() before returning');
}

finish();
