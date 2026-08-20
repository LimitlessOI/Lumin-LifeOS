#!/usr/bin/env node
/**
 * SYNOPSIS: SO-002 Layer B human-sim gate for universal-overlay -- a real
 * browser walkthrough, not a health-endpoint ping. The prior version of this
 * file only called GET /api/v1/lifeos/builder/ready and called that a pass
 * (its own comment admitted: "Scaffold gate -- expand to full browser walk
 * when overlay Layer B endpoint exists"). That endpoint now exists:
 * routes/extension-drive-routes.js, backed by services/extension-drive-bridge.js's
 * createDriveSession/makeExtensionObserve/makeExtensionAct/makeExtensionVerify.
 *
 * Architectural note (why this script calls HTTP, not those functions
 * directly): the bridge's session state is an in-memory Map that only exists
 * inside the deployed server process. A standalone script importing
 * createDriveSession would create its OWN empty session store, disconnected
 * from the real one -- broken by construction. The only correct way to drive
 * a real session from outside the server is the real HTTP surface those
 * functions are mounted behind: POST /start, GET /status, GET /next,
 * POST /result. This script exercises that real surface.
 *
 * Honest constraint, not a bug: makeExtensionVerify's own doc comment is
 * explicit -- "Goal verification is Adam's own real confirmation -- he is
 * watching his own tab -- never a self-reported model claim." A session
 * only produces real evidence when a real browser tab with the extension
 * active is polling /next and posting to /result. Run without one, this
 * script cannot fabricate a pass -- it reports the honest state (no live
 * tab connected) with a concrete proposed_solution, per SO-002's
 * solution-mandatory rule. This script does NOT flip
 * SENTRY_PRODUCT_REGISTRY.json's Layer B status -- that requires a human to
 * confirm a real receipt exists from an actual live run, never something a
 * script may claim about its own output.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(ROOT, 'products/receipts/SENTRY_OVERLAY_LAYER_B.json');
const BASE = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';
const POLL_MS = 4000;
const POLL_BUDGET_MS = 60_000; // real, bounded -- well under Railway's request timeout

function finding(code, detail, proposed_solution) {
  return { code, detail, proposed_solution, product: 'universal-overlay' };
}

async function driveOneRealSession() {
  const startRes = await fetch(`${BASE}/api/v1/extension/drive/start`, {
    method: 'POST',
    headers: { 'x-command-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      user: 'sentry-layer-b',
      goal: 'Observe the universal-overlay surface (public/overlay/lifeos-app.html) and confirm the overlay host is visibly reachable.',
      url: `${BASE}/overlay/lifeos-app.html`,
      maxSteps: 3,
    }),
  });
  const startBody = await startRes.json().catch(() => ({}));
  if (!startRes.ok || !startBody?.session_id) {
    return {
      ok: false,
      findings: [finding(
        'drive_session_start_failed',
        `POST /api/v1/extension/drive/start returned ${startRes.status}: ${JSON.stringify(startBody).slice(0, 300)}`,
        'Confirm routes/extension-drive-routes.js is mounted and PUBLIC_BASE_URL/COMMAND_CENTER_KEY are set correctly, then re-run this script.',
      )],
    };
  }

  const sessionId = startBody.session_id;
  const deadline = Date.now() + POLL_BUDGET_MS;
  let last = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const statusRes = await fetch(`${BASE}/api/v1/extension/drive/status?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { 'x-command-key': KEY },
    });
    const statusBody = await statusRes.json().catch(() => ({}));
    last = statusBody?.session || null;
    if (last && last.status !== 'running') break;
  }

  if (!last) {
    return {
      ok: false,
      session_id: sessionId,
      findings: [finding(
        'drive_status_unreachable',
        'GET /api/v1/extension/drive/status never returned a session row within the poll budget.',
        'Check the extension_drive_sessions table exists and the /status route is reachable; re-run this script.',
      )],
    };
  }

  const stepCount = Array.isArray(last.steps) ? last.steps.length : 0;
  const timedOutWaitingForTab = stepCount === 0 && (
    (last.status === 'running')
    || (last.status === 'failed' && /frame_timeout/i.test(String(last.result?.reason || '')))
  );
  if (timedOutWaitingForTab) {
    // The honest, expected outcome when nobody has the extension open on a
    // real tab right now -- observe() blocked in waitForFrame() until its
    // 45s timeout, which runBrowserGoal's promise rejection then reports as
    // status:'failed', reason:'crashed:frame_timeout' (confirmed by an
    // actual run against production, 2026-08-20 -- not assumed). Zero steps
    // ever recorded either way; not a code failure, a live-session gap.
    return {
      ok: false,
      session_id: sessionId,
      verdict: 'LIVE_SESSION_NOT_PROVEN',
      findings: [finding(
        'no_live_browser_tab',
        `Session ${sessionId} started but produced zero steps within the poll budget (final status=${last.status}, reason=${last.result?.reason || 'n/a'}) -- no real browser tab with the Universal Overlay extension active was polling GET /api/v1/extension/drive/next to drive it.`,
        'Open a real browser tab with the Universal Overlay extension installed and active on any page, then re-run this script (or POST /api/v1/extension/drive/start directly) while that tab is open -- the extension auto-picks up the session via GET /pending-for-user.',
      )],
    };
  }

  if (last.status === 'done' && last.result?.ok) {
    return { ok: true, session_id: sessionId, session: last };
  }

  return {
    ok: false,
    session_id: sessionId,
    findings: [finding(
      last.status === 'handoff' ? 'handoff_required' : 'drive_session_failed',
      `Session ended with status=${last.status}, result=${JSON.stringify(last.result || {}).slice(0, 300)}`,
      last.status === 'handoff'
        ? `A human-only step was needed: ${JSON.stringify(last.handoff || {}).slice(0, 200)} -- resolve it manually, then re-run.`
        : 'Inspect the session steps in extension_drive_sessions for the real point of failure and fix the specific overlay surface it broke on, then re-run.',
    )],
  };
}

async function runLayerB() {
  if (!BASE || !KEY) {
    return {
      ok: false,
      layer: 'layer-b',
      findings: [finding('no_prod_creds', 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY not set.', 'Set both env vars before running this script against a real deployment.')],
    };
  }
  const result = await driveOneRealSession();
  return { layer: 'layer-b', product: 'universal-overlay', ...result };
}

async function main() {
  console.log('▶ universal-overlay Layer B (layer-b) -- real session-driven walkthrough…');
  const result = await runLayerB();

  const receipt = {
    schema: 'sentry_layer_b_receipt_v1',
    product: 'universal-overlay',
    ran_at: new Date().toISOString(),
    ok: result.ok === true,
    verdict: result.verdict || (result.ok ? 'PASS' : 'FAIL'),
    session_id: result.session_id || null,
    findings: result.findings || [],
  };
  try {
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`Receipt written: ${RECEIPT_PATH}`);
  } catch (err) {
    console.error('Receipt write failed (non-fatal to the verdict itself):', err.message);
  }

  if (!result.ok) {
    console.error('Layer B FAIL', { verdict: receipt.verdict, session_id: receipt.session_id });
    for (const f of result.findings || []) {
      if (!f.proposed_solution) throw new Error('finding missing proposed_solution');
      console.error(`  [${f.code}] ${f.detail}`);
      console.error(`  proposed_solution: ${f.proposed_solution}`);
    }
    process.exit(1);
  }
  console.log('Layer B PASS', { product: 'universal-overlay', layer: 'layer-b', session_id: receipt.session_id });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
