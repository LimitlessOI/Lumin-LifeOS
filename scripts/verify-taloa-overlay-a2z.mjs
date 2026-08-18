#!/usr/bin/env node
/**
 * SYNOPSIS: TALOA-A2Z-008 -- zero-deception acceptance harness for the
 * Overlay A-to-Z pipeline (TALOA-OVERLAY-P1-0001). First proves the seven
 * service contracts behaviorally against deterministic fixtures. Then, and
 * only then, checks for real authenticated-session evidence. Verdicts:
 * TECHNICAL_PARTIAL (structural/behavioral proof incomplete),
 * LIVE_SESSION_NOT_PROVEN (contracts proven, no real session evidence yet),
 * PASS (both proven), HARD_CAPABILITY_BLOCKER (a contract itself is broken).
 * Structural tests can never be silently promoted into an end-to-end PASS.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

import { createOverlayObservationEngine } from '../services/taloa/overlay-observation-engine.js';
import { createOverlayTargetSelector } from '../services/taloa/overlay-target-selector.js';
import { createOverlayActionRouter } from '../services/taloa/overlay-action-router.js';
import { createOverlayResultVerifier } from '../services/taloa/overlay-result-verifier.js';
import { createChatGPTBrowserConversationAdapter } from '../services/taloa/chatgpt-browser-conversation-adapter.js';
import { createOverlayRuntimeTruth } from '../services/taloa/overlay-runtime-truth.js';
import { createOverlayContinuationSupervisor } from '../services/taloa/overlay-continuation-supervisor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'TALOA-OVERLAY-P1-0001';
const RECEIPT_REL = 'products/receipts/TALOA_OVERLAY_A2Z_ACCEPTANCE.json';
const RECEIPT = path.join(ROOT, RECEIPT_REL);
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');
const LIVE_EVIDENCE_PATH = path.join(ROOT, 'products/receipts/TALOA_OVERLAY_A2Z_LIVE_SESSION.json');

const report = {
  schema: 'taloa_overlay_a2z_acceptance_v1',
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

function fixtureSnapshot({ generating = false, dialogs = [], elements = null } = {}) {
  return {
    url: 'https://chatgpt.com/c/fixture',
    title: 'Fixture Conversation',
    generating,
    dialogs,
    elements: elements || [
      { tag: 'textarea', type: 'text', selector: '#composer', text: '' },
      { tag: 'button', type: 'submit', selector: '#send', text: 'Send' },
    ],
  };
}

async function testObservationEngine() {
  const engine = createOverlayObservationEngine();
  const scene = engine.observe(fixtureSnapshot());
  step('A2Z001_observe_returns_required_fields', Boolean(scene.observed_at && typeof scene.confidence === 'number' && Array.isArray(scene.actionable)), 'checked observed_at/confidence/actionable');
  const cls = engine.classify(fixtureSnapshot());
  step('A2Z001_classify_returns_label', typeof cls === 'string' && cls.length > 0, `classify() -> ${cls}`);
  return engine;
}

async function testTargetSelector(engine) {
  const selector = createOverlayTargetSelector();
  const scene = engine.observe(fixtureSnapshot());
  const picked = selector.select(scene, { kind: 'click', label: 'send' });
  step('A2Z002_select_returns_evidence_and_confidence', Boolean(picked && typeof picked.confidence === 'number'), 'checked select() output shape');
  const empty = selector.select(engine.observe(fixtureSnapshot({ elements: [] })), {});
  step('A2Z002_low_confidence_blocker_on_no_candidates', empty.ok === false && empty.blocker === 'LOW_CONFIDENCE', 'checked LOW_CONFIDENCE path');
  return selector;
}

async function testActionRouter() {
  const router = createOverlayActionRouter();
  const planned = router.plan({ type: 'click' }, { selector: '#send' }, { authorized: true });
  step('A2Z003_plan_accepts_supported_action', planned.ok === true, 'checked plan() for click');
  const executed = await router.execute(planned, { dom: async () => ({ ok: true }) });
  step('A2Z003_execute_succeeds_with_wired_adapter', executed.ok === true && executed.tree === 'dom', 'checked execute() fallback resolution');
  const failedExec = await router.execute(planned, {});
  step('A2Z003_execute_fails_closed_with_no_adapters', failedExec.ok === false, 'checked no-silent-success when no tree is wired');
  return router;
}

async function testResultVerifier(engine) {
  const verifier = createOverlayResultVerifier();
  const before = engine.observe(fixtureSnapshot({ elements: [{ tag: 'textarea', selector: '#composer', text: '' }] }));
  const after = engine.observe(fixtureSnapshot({ elements: [{ tag: 'textarea', selector: '#composer', text: 'hi' }] }));
  const verdict = verifier.verify({ before, plan: { type: 'type' }, after, acceptance: null });
  step('A2Z004_verify_detects_real_state_change', verdict.status === 'VERIFIED', `verify() -> ${verdict.status}`);
  const noChange = verifier.verify({ before, plan: { type: 'type' }, after: before, acceptance: null, attemptCount: 2 });
  step('A2Z004_verify_never_silent_success_on_unchanged_state', noChange.status !== 'VERIFIED', `verify() -> ${noChange.status}`);
  return verifier;
}

async function testChatGptAdapter(engine, selector) {
  const adapter = createChatGPTBrowserConversationAdapter({ observationEngine: engine, targetSelector: selector });
  const working = adapter.classifyState(fixtureSnapshot({ generating: true }));
  step('A2Z005_classifies_working_state', working.state === 'CHATGPT_WORKING', `classifyState() -> ${working.state}`);
  const approval = adapter.classifyState(fixtureSnapshot({ dialogs: [{ title: 'Allow ChatGPT to use GitHub?' }] }));
  step('A2Z005_classifies_approval_required', approval.state === 'APPROVAL_REQUIRED_CURRENT', `classifyState() -> ${approval.state}`);
  const idle = adapter.classifyState(fixtureSnapshot());
  step('A2Z005_classifies_turn_complete', idle.state === 'TURN_COMPLETE', `classifyState() -> ${idle.state}`);
  return adapter;
}

function testRuntimeTruth() {
  const truth = createOverlayRuntimeTruth({ bodyIdentity: 'taloa_overlay_test' });
  const offline = truth.snapshot();
  step('A2Z006_offline_before_first_heartbeat', offline.heartbeat_status === 'OFFLINE', 'checked pre-heartbeat state');
  truth.heartbeat();
  const fresh = truth.snapshot();
  step('A2Z006_fresh_after_heartbeat', fresh.heartbeat_status === 'FRESH', 'checked post-heartbeat state');
  return truth;
}

async function testSupervisor(engine, selector, router, verifier, adapter, truth) {
  const supervisor = createOverlayContinuationSupervisor({
    observationEngine: engine,
    targetSelector: selector,
    actionRouter: router,
    resultVerifier: verifier,
    chatGptAdapter: adapter,
    runtimeTruth: truth,
  });
  let call = 0;
  const getSnapshot = async () => {
    call += 1;
    return call === 1
      ? fixtureSnapshot({ elements: [{ tag: 'textarea', selector: '#composer', text: '' }, { tag: 'button', type: 'submit', selector: '#send', text: 'Send' }] })
      : fixtureSnapshot({ elements: [{ tag: 'textarea', selector: '#composer', text: 'hello' }] });
  };
  const result = await supervisor.runCycle({
    getSnapshot,
    adapters: { dom: async () => ({ ok: true }) },
    intent: { messageText: 'hello' },
    authorized: true,
  });
  step('A2Z007_cycle_reaches_non_idle_terminal_or_continue', ['CONTINUE', 'VERIFIED', 'POINT_B_REACHED'].includes(result.state), `runCycle() -> ${result.state}`);

  const exhausted = await supervisor.runCycle({ getSnapshot: null });
  step('A2Z007_no_snapshot_source_is_blueprint_exhausted_not_idle', exhausted.state === 'BLUEPRINT_EXHAUSTED', `runCycle(no source) -> ${exhausted.state}`);
}

function checkLiveSessionEvidence() {
  if (!fs.existsSync(LIVE_EVIDENCE_PATH)) {
    return { present: false, reason: `no evidence file at ${path.relative(ROOT, LIVE_EVIDENCE_PATH)}` };
  }
  try {
    const evidence = JSON.parse(fs.readFileSync(LIVE_EVIDENCE_PATH, 'utf8'));
    const required = ['authenticated_session_id', 'observed_at', 'actor', 'before_state', 'after_state'];
    const missing = required.filter((k) => !evidence[k]);
    if (missing.length) return { present: false, reason: `evidence file missing fields: ${missing.join(',')}` };
    if (evidence.actor !== 'universal_overlay') return { present: false, reason: `actor was '${evidence.actor}', not universal_overlay -- harness cannot count a non-product actor` };
    return { present: true, evidence };
  } catch (err) {
    return { present: false, reason: `evidence file unreadable: ${err.message}` };
  }
}

async function run() {
  const engine = await testObservationEngine();
  const selector = await testTargetSelector(engine);
  const router = await testActionRouter();
  const verifier = await testResultVerifier(engine);
  const adapter = await testChatGptAdapter(engine, selector);
  const truth = testRuntimeTruth();
  await testSupervisor(engine, selector, router, verifier, adapter, truth);

  const behavioralPass = report.tests_failed.length === 0;
  const liveCheck = checkLiveSessionEvidence();

  let taloa_a2z_verdict;
  if (!behavioralPass) {
    taloa_a2z_verdict = 'TECHNICAL_PARTIAL';
  } else if (!liveCheck.present) {
    taloa_a2z_verdict = 'LIVE_SESSION_NOT_PROVEN';
  } else {
    taloa_a2z_verdict = 'PASS';
  }
  report.taloa_a2z_verdict = taloa_a2z_verdict;
  report.live_session_check = liveCheck.present ? { present: true } : { present: false, reason: liveCheck.reason };

  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'Taloa Overlay A-to-Z pipeline',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: { build_method: 'hand-authored', note: 'HAND-AUTHORED-JUSTIFICATION: founder-directed urgent revenue path, 2026-08-18; SO-001 exception explicitly authorized by founder given real financial urgency.' },
    verdictExtra: { taloa_a2z_verdict, acceptance_command: 'node scripts/verify-taloa-overlay-a2z.mjs' },
    passPredicate: () => taloa_a2z_verdict === 'PASS',
  });

  console.log(`\nBehavioral: ${report.tests_passed.length} passed, ${report.tests_failed.length} failed`);
  console.log(`Verdict: ${taloa_a2z_verdict}`);
  if (taloa_a2z_verdict !== 'PASS') {
    console.log(taloa_a2z_verdict === 'LIVE_SESSION_NOT_PROVEN' ? `Reason: ${liveCheck.reason}` : `Failures: ${report.tests_failed.join(', ')}`);
  }
  process.exit(pass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
