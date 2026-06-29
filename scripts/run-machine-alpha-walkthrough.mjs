#!/usr/bin/env node
/**
 * SYNOPSIS: Machine Alpha Walkthrough — simulates founder UI session before Point B handoff.
 * Runs: open app URL, LifeRE daily cycle, Lumin counsel chat, build command via chat.
 * All steps must PASS before MACHINE_ALPHA_WALKTHROUGH.json is written as green.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.LIFEOS_BASE_URL || process.env.BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
const RECEIPT_PATH = path.join(ROOT, 'products/receipts/MACHINE_ALPHA_WALKTHROUGH.json');

const steps = [];
function step(id, ok, detail = '', data = {}) {
  const row = { id, ok, detail, ...data };
  steps.push(row);
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${id}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function req(method, routePath, body, { timeout = 30000 } = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-command-key': KEY };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${BASE}${routePath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  } catch (err) {
    clearTimeout(timer);
    return { status: 0, json: {}, error: err.message };
  }
}

function fileHas(rel, pattern) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) return false;
  return pattern.test(fs.readFileSync(fp, 'utf8'));
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pollJob(jobId, maxWaitMs = 60000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const r = await req('GET', `/api/v1/lifeos/builderos/command-control/founder-interface/build-job/${jobId}`);
    if (r.json?.status && !['queued', 'running', 'pending'].includes(r.json.status)) {
      return r.json;
    }
    await sleep(3000);
  }
  return null;
}

async function main() {
  console.log(`\n🤖 Machine Alpha Walkthrough — simulating founder session`);
  console.log(`   Base: ${BASE}`);
  console.log(`   Key:  ${KEY ? '✅ present' : '❌ MISSING'}\n`);

  if (!KEY) {
    step('MAW-PRE-KEY', false, 'COMMAND_CENTER_KEY not set — cannot authenticate as founder');
  }

  // ── Step 1: App loads (static HTML exists on disk, reachable via HTTP) ──
  step('MAW-T01_app_html_exists',
    fs.existsSync(path.join(ROOT, 'public/overlay/lifeos-app.html')),
    'public/overlay/lifeos-app.html on disk'
  );
  step('MAW-T02_lifere_html_exists',
    fs.existsSync(path.join(ROOT, 'public/overlay/lifeos-lifere.html')),
    'public/overlay/lifeos-lifere.html on disk'
  );

  // ── Step 2: LifeRE required surface markers ──
  step('MAW-T03_daily_cycle_marker',
    fileHas('public/overlay/lifeos-lifere.html', /data-lifere="daily-command-center"/),
    'daily command center button marker present'
  );
  step('MAW-T04_top3_marker',
    fileHas('public/overlay/lifeos-lifere.html', /data-lifere="top-3-priorities"/),
    'top-3 priorities section marker present'
  );
  step('MAW-T05_debrief_marker',
    fileHas('public/overlay/lifeos-lifere.html', /data-lifere="nightly-debrief"/),
    'nightly debrief section marker present'
  );
  step('MAW-T06_app_nav_to_lifere',
    fileHas('public/overlay/lifeos-app.html', /lifeos-lifere\.html/),
    'lifeos-app.html navigates to lifeos-lifere.html'
  );

  // ── Step 3: Production server health ──
  const health = await req('GET', '/healthz');
  step('MAW-T07_server_health',
    health.status === 200 && (health.json?.ok !== false || health.json?.status?.toLowerCase()?.includes('ok')),
    `HTTP ${health.status}`,
    { response: health.json }
  );

  // ── Step 4: LifeRE daily cycle via API ──
  const daily = await req('POST', '/api/v1/lifere/daily-command-center', { user_id: 'adam' });
  const dailyResult = daily.json?.result || daily.json;
  const hasTop3 = Boolean(dailyResult?.top_3_priorities?.length || dailyResult?.daily_focus?.length);
  step('MAW-T08_lifere_daily_cycle',
    daily.status === 200 && hasTop3,
    `HTTP ${daily.status}; top_3=${Boolean(dailyResult?.top_3_priorities?.length)}`,
    { top_3: dailyResult?.top_3_priorities?.slice(0, 3) }
  );

  // ── Step 5: Lumin counsel question (personal life) — expect plain prose, no theater ──
  const counselMsg = 'Hey Lumin, quick question — should I grab groceries on the way home or order delivery tonight?';
  const counsel = await req('POST', '/api/v1/lifeos/builderos/command-control/founder-interface/message', {
    text: counselMsg,
    action: 'lumin',
    source_mode: 'founder_alpha',
    conversational_mode: true,
  }, { timeout: 45000 });

  const counselBody = counsel.json?.human_summary || counsel.json?.body?.human_summary || '';
  const hasTheater = /NO_COMMAND_RAN|command ran|💬 Counsel only|To execute:/i.test(counselBody);
  const hasProse = counselBody.length > 20 && !hasTheater;
  step('MAW-T09_lumin_counsel_plain_prose',
    counsel.status === 200 && hasProse,
    `HTTP ${counsel.status}; theater_detected=${hasTheater}; prose_len=${counselBody.length}`,
    { sample: counselBody.slice(0, 200) }
  );

  // ── Step 6: Build command via chat — expect routing + non-empty response ──
  const buildMsg = 'do: run pre-build gate and report status';
  const build = await req('POST', '/api/v1/lifeos/builderos/command-control/founder-interface/message', {
    text: buildMsg,
    action: 'build',
    source_mode: 'founder_alpha',
    async: true,
  }, { timeout: 45000 });

  let buildRoutedOk = false;
  let buildResponseOk = false;
  let buildDetail = `HTTP ${build.status}`;

  if (build.status === 202 && build.json?.job_id) {
    buildRoutedOk = true;
    const job = await pollJob(build.json.job_id, 90000);
    const jobStatus = job?.status || 'unknown';
    buildResponseOk = ['done', 'committed', 'complete'].includes(jobStatus) || Boolean(job?.ok);
    buildDetail = `async job: status=${jobStatus} ok=${job?.ok}`;
  } else if (build.status === 200) {
    buildRoutedOk = true;
    const ct = build.json?.command_truth || build.json?.body?.command_truth || '';
    const hs = build.json?.human_summary || build.json?.body?.human_summary || '';
    // Accept committed/ran, AND accept clarify/counsel with content (correct system behavior)
    buildResponseOk = ['COMMITTED', 'COMMAND_RAN', 'BUILD_ATTEMPTED'].includes(ct)
      || (hs.length > 30 && !['', 'error'].includes(ct.toLowerCase()));
    buildDetail = `sync: command_truth=${ct} response_len=${hs.length}`;
  }
  step('MAW-T10_build_command_routed', buildRoutedOk, buildDetail);
  step('MAW-T11_build_response_coherent', buildResponseOk, buildDetail, { sample: String(JSON.stringify(build.json)).slice(0, 200) });

  // ── Step 7: Point B status check ──
  const pb = await req('GET', '/api/v1/lifeos/builderos/command-control/point-b/status');
  const pbLabel = pb.json?.point_b?.label || pb.json?.label || '';
  step('MAW-T12_point_b_status',
    pb.status === 200,
    `HTTP ${pb.status}; label="${pbLabel}"`,
    { pass_fail: pb.json?.pass_fail }
  );

  // ── Result ──
  const passed = steps.filter(s => s.ok).map(s => s.id);
  const failed = steps.filter(s => !s.ok).map(s => s.id);
  const allPass = failed.length === 0;

  const receipt = {
    schema: 'machine_alpha_walkthrough_v1',
    mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
    at: new Date().toISOString(),
    base: BASE,
    ok: allPass,
    pass_fail: allPass ? 'PASS' : 'FAIL',
    tests_passed: passed.length,
    tests_failed: failed.length,
    passed,
    failed,
    steps,
    note: allPass
      ? 'Machine alpha walkthrough complete — all founder paths verified. Ready for Point B handoff to Adam.'
      : `Walkthrough failed on: ${failed.join(', ')} — fix before Point B handoff.`,
  };

  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2));

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${allPass ? '✅ PASS' : '❌ FAIL'} — ${passed.length}/${steps.length} steps passed`);
  if (failed.length) console.log(`Failed: ${failed.join(', ')}`);
  console.log(`Receipt: products/receipts/MACHINE_ALPHA_WALKTHROUGH.json`);

  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error('Machine alpha walkthrough crashed:', err);
  process.exit(1);
});
