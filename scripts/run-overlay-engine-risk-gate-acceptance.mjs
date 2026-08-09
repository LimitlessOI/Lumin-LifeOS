#!/usr/bin/env node
/**
 * SYNOPSIS: Overlay Engine Risk Gate acceptance.
 * PASS = the REAL, live, model-driven overlay engine (services/general-browser-agent.js,
 * already behind POST /api/v1/browser-agent/run + marketing-publisher.js +
 * browser-signup-orchestrator.js) blocks a real observed risky-labeled click by
 * default, allows it when explicitly authorized, and the authorization flag is
 * actually threaded end-to-end from the live route through to the core loop --
 * not just present in one file in isolation.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'OVERLAY-ENGINE-RISK-GATE-0001';
const CORE = path.join(ROOT, 'services/general-browser-agent.js');
const WRAPPER = path.join(ROOT, 'services/general-browser-agent-live.js');
const ROUTE = path.join(ROOT, 'routes/general-browser-agent-routes.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'OVERLAY_ENGINE_RISK_GATE_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/OVERLAY_ENGINE_RISK_GATE_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'overlay_engine_risk_gate_acceptance_v1',
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
    objectiveName: 'Overlay Engine Risk Gate',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Fail-closed risk-authorization guardrail for the real, live, model-driven overlay engine -- foundational prerequisite before any autonomous commerce/opportunity capability is built on top of it.',
    },
    verdictExtra: {
      acceptance_command: 'npm run overlay:engine-risk-gate:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

step('core_engine_exists', fs.existsSync(CORE), CORE);
if (fs.existsSync(CORE)) {
  try {
    const mod = await import(`file://${CORE}`);
    step('exports_isRiskyClick_and_patterns',
      typeof mod.isRiskyClick === 'function' && Array.isArray(mod.RISKY_ACTION_LABEL_PATTERNS) && mod.RISKY_ACTION_LABEL_PATTERNS.length > 0,
      { exported: Object.keys(mod) });

    if (typeof mod.isRiskyClick === 'function') {
      const risky = mod.isRiskyClick(
        { type: 'click', selector: '#buy-btn-142' },
        { url: 'x', elements: [{ selector: '#buy-btn-142', text: 'Complete Purchase' }] },
      );
      step('detects_risky_purchase_click', risky === true, { risky });

      const deleteRisky = mod.isRiskyClick(
        { type: 'click', selector: '#danger-1' },
        { url: 'x', elements: [{ selector: '#danger-1', text: 'Delete Account' }] },
      );
      step('detects_risky_delete_click', deleteRisky === true, { deleteRisky });

      const safe = mod.isRiskyClick(
        { type: 'click', selector: '#login-btn' },
        { url: 'x', elements: [{ selector: '#login-btn', text: 'Log In' }] },
      );
      step('does_not_flag_login_click', safe === false, { safe });

      const notClick = mod.isRiskyClick(
        { type: 'navigate', url: 'https://example.com' },
        { url: 'x', elements: [] },
      );
      step('does_not_flag_non_click_actions', notClick === false, { notClick });
    }

    if (typeof mod.runBrowserGoal === 'function') {
      // Real behavioral proof against the actual loop, not just the classifier in isolation.
      const observation = { url: 'https://shop.example.com/cart', title: 'Cart', text: '', elements: [{ selector: '#buy-btn', text: 'Buy Now' }] };
      let acted = false;
      const blockedResult = await mod.runBrowserGoal({
        goal: 'buy the item',
        observe: async () => observation,
        decideAction: async () => ({ type: 'click', selector: '#buy-btn' }),
        act: async () => { acted = true; return { ok: true }; },
        verifyGoal: async () => ({ reached: false }),
        maxSteps: 1,
      });
      step('runBrowserGoal_blocks_risky_click_by_default',
        blockedResult.ok === false && !acted && String(blockedResult.reason || '').startsWith('risky_action_requires_authorization:'),
        { blockedResult, acted });

      acted = false;
      const allowedResult = await mod.runBrowserGoal({
        goal: 'buy the item',
        observe: async () => observation,
        decideAction: async () => ({ type: 'click', selector: '#buy-btn' }),
        act: async () => { acted = true; return { ok: true }; },
        verifyGoal: async () => ({ reached: false }),
        maxSteps: 1,
        allowRiskyActions: true,
      });
      step('runBrowserGoal_allows_risky_click_when_authorized', acted === true, { allowedResult, acted });

      // Regression proof: a non-risky goal must behave exactly as before this mission.
      // decideAction is stateful (click once, then done) so the loop can reach a real
      // goal_verified outcome -- a single fixed action can never produce ok:true on its
      // own since the loop only terminates successfully on a 'done' action.
      const safeObservation = { url: 'https://example.com', title: 'Home', text: '', elements: [{ selector: '#login-btn', text: 'Log In' }] };
      let safeActed = false;
      let safeCall = 0;
      const safeResult = await mod.runBrowserGoal({
        goal: 'log in',
        observe: async () => safeObservation,
        decideAction: async () => {
          safeCall += 1;
          return safeCall === 1 ? { type: 'click', selector: '#login-btn' } : { type: 'done' };
        },
        act: async () => { safeActed = true; return { ok: true }; },
        verifyGoal: async () => ({ reached: true, evidence: {} }),
        maxSteps: 3,
      });
      step('runBrowserGoal_unaffected_for_non_risky_goals', safeActed === true && safeResult.ok === true && safeResult.reached === true, { safeResult, safeActed });
    }
  } catch (err) {
    step('core_engine_imports_and_behaves_correctly', false, { error: err.message, stack: err.stack });
  }
}

// Reachability enforcement (per the new standing CLAUDE.md rule): the flag has to be
// threaded end-to-end from the live route through the wrapper into the core loop --
// not just present in one file in isolation.
step('wrapper_exists', fs.existsSync(WRAPPER), WRAPPER);
if (fs.existsSync(WRAPPER)) {
  const src = fs.readFileSync(WRAPPER, 'utf8');
  step('wrapper_threads_allowRiskyActions',
    /allowRiskyActions/.test(src) && /runBrowserGoal\(\{[\s\S]*allowRiskyActions/.test(src),
    'services/general-browser-agent-live.js must accept AND forward allowRiskyActions into runBrowserGoal');
}

step('route_exists', fs.existsSync(ROUTE), ROUTE);
if (fs.existsSync(ROUTE)) {
  const src = fs.readFileSync(ROUTE, 'utf8');
  step('route_accepts_allowRiskyActions_from_request_body', /allowRiskyActions\s*=\s*false/.test(src), 'must be a real req.body field with a safe default');
  step('route_forwards_allowRiskyActions_into_runGoalOnSession',
    /runGoalOnSession\(\{[\s\S]{0,400}allowRiskyActions:\s*allowRiskyActions/.test(src),
    'the live /run endpoint must actually pass the flag through, not just accept it');
}

finish();
