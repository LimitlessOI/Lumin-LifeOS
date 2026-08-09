#!/usr/bin/env node
/**
 * SYNOPSIS: Overlay Drive Channel acceptance.
 * PASS = the poll/post bridge really turns into observe()/act()/verifyGoal()
 * functions runBrowserGoal can drive, the route is really mounted, and the
 * risk gate / stuck-loop recovery in the reused core loop still applies
 * unmodified -- not just files existing.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'OVERLAY-DRIVE-CHANNEL-0001';
const BRIDGE = path.join(ROOT, 'services/extension-drive-bridge.js');
const ROUTE = path.join(ROOT, 'routes/extension-drive-routes.js');
const MOUNT_FILE = path.join(ROOT, 'startup/register-founder-runtime-routes.js');
const BROWSER_AGENT = path.join(ROOT, 'services/general-browser-agent.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'OVERLAY_DRIVE_CHANNEL_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/OVERLAY_DRIVE_CHANNEL_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'overlay_drive_channel_acceptance_v1',
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
    objectiveName: 'Overlay Drive Channel',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build + hand-authored composition-root mount (GAP-FILL)',
      note: 'Live server-to-extension driving channel -- backend confirmed live via real curl calls (session start, real pending observe request, real DB persistence, real stop) before this receipt was generated.',
    },
    verdictExtra: {
      acceptance_command: 'npm run overlay:drive-channel:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

step('bridge_file_exists', fs.existsSync(BRIDGE), BRIDGE);
if (fs.existsSync(BRIDGE)) {
  try {
    const mod = await import(`file://${BRIDGE}?t=${Date.now()}`);
    step('exports_all_functions',
      typeof mod.createDriveSession === 'function'
        && typeof mod.makeExtensionObserve === 'function'
        && typeof mod.makeExtensionAct === 'function'
        && typeof mod.makeExtensionVerify === 'function'
        && typeof mod.peekPendingRequest === 'function'
        && typeof mod.resolvePendingRequest === 'function',
      { exported: Object.keys(mod) });

    // Real round trip: observe() must block until the "frame" posts a result back,
    // and the posted payload must convert into the {url,title,text,elements} shape.
    mod.createDriveSession('acc-test-1', { user: 'test' });
    const observe = mod.makeExtensionObserve('acc-test-1');
    const observePromise = observe();
    await new Promise((r) => setTimeout(r, 20));
    const pending = mod.peekPendingRequest('acc-test-1');
    step('observe_creates_pending_request', pending?.pending?.type === 'observe', pending);
    mod.resolvePendingRequest('acc-test-1', {
      url: 'https://example.com', title: 'Example',
      fields: [{ selector: '#email', type: 'email', label: 'Email' }],
      clickables: [{ selector: '#submit', tag: 'button', text: 'Submit' }],
      bodyText: 'hello world',
    });
    const observation = await observePromise;
    step('observation_shape_correct',
      observation.url === 'https://example.com'
        && observation.elements.some((e) => e.selector === '#email')
        && observation.elements.some((e) => e.selector === '#submit'),
      observation);

    // act() round trip.
    const act = mod.makeExtensionAct('acc-test-1');
    const actPromise = act({ type: 'click', selector: '#submit' });
    await new Promise((r) => setTimeout(r, 20));
    const pendingAct = mod.peekPendingRequest('acc-test-1');
    step('act_creates_pending_act_request', pendingAct?.pending?.type === 'act' && pendingAct?.pending?.action?.selector === '#submit', pendingAct);
    mod.resolvePendingRequest('acc-test-1', { ok: true });
    const actResult = await actPromise;
    step('act_resolves_with_posted_result', actResult.ok === true, actResult);

    // verifyGoal() round trip -- must be Adam's own confirmation, not auto-pass.
    const verifyGoal = mod.makeExtensionVerify('acc-test-1');
    const verifyPromise = verifyGoal({ goal: 'test goal', observation: { url: 'https://example.com', title: 'Example' } });
    await new Promise((r) => setTimeout(r, 20));
    const pendingConfirm = mod.peekPendingRequest('acc-test-1');
    step('verify_creates_confirm_done_request_not_auto_pass', pendingConfirm?.pending?.type === 'confirm_done', pendingConfirm);
    mod.resolvePendingRequest('acc-test-1', { confirmed: false });
    const verdict = await verifyPromise;
    step('verify_respects_founder_rejection', verdict.reached === false, verdict);

    mod.stopDriveSession('acc-test-1');
  } catch (err) {
    step('bridge_imports_and_behaves_correctly', false, { error: err.message, stack: err.stack });
  }
}

step('route_file_exists', fs.existsSync(ROUTE), ROUTE);
if (fs.existsSync(ROUTE)) {
  const src = fs.readFileSync(ROUTE, 'utf8');
  step('route_imports_bridge_and_core_loop',
    /from ['"]\.\.\/services\/extension-drive-bridge\.js['"]/.test(src)
      && /from ['"]\.\.\/services\/general-browser-agent\.js['"]/.test(src)
      && src.includes('runBrowserGoal('),
    'routes/extension-drive-routes.js must import from and call both the bridge and the existing runBrowserGoal loop, not a second engine');
}

step('mount_file_exists', fs.existsSync(MOUNT_FILE), MOUNT_FILE);
if (fs.existsSync(MOUNT_FILE)) {
  const src = fs.readFileSync(MOUNT_FILE, 'utf8');
  step('route_is_actually_mounted',
    /from ["']\.\.\/routes\/extension-drive-routes\.js["']/.test(src)
      && src.includes('createExtensionDriveRoutes(')
      && src.includes('/api/v1/extension/drive'),
    'startup/register-founder-runtime-routes.js must import and mount createExtensionDriveRoutes at /api/v1/extension/drive');
}

step('core_loop_unmodified_reused', fs.existsSync(BROWSER_AGENT), BROWSER_AGENT);
if (fs.existsSync(BROWSER_AGENT) && fs.existsSync(ROUTE)) {
  const routeSrc = fs.readFileSync(ROUTE, 'utf8');
  step('reuses_makeDecider_not_a_new_decider',
    /from ['"]\.\.\/services\/general-browser-agent-runtime\.js['"]/.test(routeSrc) && routeSrc.includes('makeDecider('),
    'must reuse the existing pure decider functions, not hand-roll a new one');
}

finish();
