#!/usr/bin/env node
/**
 * SYNOPSIS: Founder message -> Chair -> governed action -> receipt -> dashboard
 * parity end-to-end proof. Mints a real browser session from the Railway vault
 * (never touches the password), drives the actual Lumin drawer as a real
 * client would, creates a real commitment, queries it back through Chair,
 * cross-checks the same record through the dashboard-facing API, and tests
 * one deliberately malformed input for honest failure handling.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';
const RECEIPT = path.join(ROOT, 'products/receipts/FOUNDER_E2E_LOOP_VERIFICATION.json');
const SHOT_DIR = path.join(ROOT, 'products/receipts/founder_e2e_loop_screenshots');
const TIMEOUT = 45_000;
const TEST_TITLE = `Communication System E2E Test ${Date.now()}`;

async function mintBrowserSession() {
  const res = await fetch(`${BASE}/api/v1/lifeos/auth/operator/mint-browser-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`mint-browser-session failed: HTTP ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function sendAndWaitForReply(page, text) {
  const preCount = await page.locator('.lumin-msg.assistant').count();
  await page.fill('#lumin-input', text);
  await page.click('#lumin-send-btn');
  let replyText = '';
  let repliedInTime = false;
  try {
    await page.waitForFunction(
      (preCount) => {
        const nodes = document.querySelectorAll('.lumin-msg.assistant');
        if (nodes.length <= preCount) return false;
        const last = nodes[nodes.length - 1];
        return last.textContent && last.textContent.trim().length > 0;
      },
      preCount,
      { timeout: 60_000 },
    );
    repliedInTime = true;
    replyText = await page.locator('.lumin-msg.assistant').last().evaluate((el) => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('.lumin-msg-time').forEach((t) => t.remove());
      return clone.textContent || '';
    });
  } catch {
    repliedInTime = false;
  }
  await page.waitForTimeout(500);
  return { text: text, replied_in_time: repliedInTime, reply: replyText.trim() };
}

async function main() {
  const report = {
    schema: 'founder_e2e_loop_verification_v1',
    at: new Date().toISOString(),
    base: BASE,
    test_title: TEST_TITLE,
    ok: false,
    steps: {},
    findings: [],
  };

  if (!KEY) {
    report.error = 'COMMAND_CENTER_KEY required';
    fs.writeFileSync(RECEIPT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  let session;
  try {
    session = await mintBrowserSession();
    report.steps.mint_session = { ok: true, cred_source: session.cred_source };
  } catch (e) {
    report.steps.mint_session = { ok: false, error: e.message };
    fs.writeFileSync(RECEIPT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await context.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('lifeos_access_token', access);
        if (refresh) localStorage.setItem('lifeos_refresh_token', refresh);
      },
      { access: session.access_token, refresh: session.refresh_token || '' },
    );

    await page.goto(`${BASE}/overlay/lifeos-app.html?direct_system=1`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForTimeout(1500);
    const onApp = /lifeos-app\.html/i.test(page.url());
    report.steps.authenticated_load = { ok: onApp, url: page.url() };
    if (!onApp) throw new Error('did not reach app');

    await page.waitForSelector('#lumin-drawer.open', { timeout: TIMEOUT });
    report.steps.drawer_opened = { ok: true };

    // ── Step 1: real, safe, reversible governed action via the real UI ──
    const createMsg = `Schedule a commitment: ${TEST_TITLE} tomorrow at 9am`;
    const createResult = await sendAndWaitForReply(page, createMsg);
    report.steps.create_commitment = createResult;
    await page.screenshot({ path: path.join(SHOT_DIR, '01-create-commitment.png') });
    if (!createResult.replied_in_time) {
      report.findings.push({ severity: 'blocker', summary: 'No reply to commitment-creation message within 60s', proposed_solution: 'Check lifeos-chat-intent-executor.js classifyIntent/executeIntent path for errors on this exact phrasing' });
    }

    // ── Step 2: ask Chair to retrieve it back (query-mode) ──
    const queryResult = await sendAndWaitForReply(page, 'what are my upcoming commitments');
    report.steps.query_via_chair = queryResult;
    await page.screenshot({ path: path.join(SHOT_DIR, '02-query-via-chair.png') });
    const chairSeesIt = queryResult.reply.includes(TEST_TITLE);
    report.steps.chair_sees_new_commitment = { ok: chairSeesIt };
    if (!chairSeesIt) {
      report.findings.push({
        severity: 'blocker',
        summary: 'Chair could not retrieve the commitment it just created, via its own query-mode',
        failure_scenario: `Sent "${createMsg}", then asked "what are my upcoming commitments" -- reply did not mention "${TEST_TITLE}"`,
        proposed_solution: 'Trace lifeos-chat-intent-executor.js commitment_query case -- confirm it reads from the same table/userId captureCommitment just wrote to',
      });
    }

    // ── Step 3: cross-check the SAME record through the dashboard-facing API ──
    const apiCheck = await page.evaluate(async (base) => {
      const r = await CTX.fetchWithAuth(`${base}/api/v1/lifeos/commitments?user=adam`);
      const d = await r.json().catch(() => ({}));
      return { status: r.status, ok: d.ok, count: d.count, titles: (d.commitments || []).map((c) => c.title || c.description || c.text || JSON.stringify(c).slice(0, 80)) };
    }, BASE);
    report.steps.dashboard_api_check = apiCheck;
    const dashboardSeesIt = (apiCheck.titles || []).some((t) => String(t).includes(TEST_TITLE));
    report.steps.dashboard_sees_new_commitment = { ok: dashboardSeesIt };
    if (!dashboardSeesIt) {
      report.findings.push({
        severity: 'blocker',
        summary: 'The commitment Chair created is not visible through GET /api/v1/lifeos/commitments (the dashboard-equivalent API)',
        failure_scenario: `Chair created "${TEST_TITLE}" via chat; GET /commitments?user=adam titles were: ${JSON.stringify(apiCheck.titles)}`,
        proposed_solution: 'Chair path (lifeos-commitment-service.js captureCommitment) and dashboard path (routes/lifeos-core-routes.js GET /commitments -> commitments.getOpen) may resolve a different userId or read from a different table/status filter -- trace both to the same row',
      });
    }

    // ── Step 4: real parity verdict ──
    report.steps.chair_dashboard_parity = { ok: chairSeesIt && dashboardSeesIt };

    // ── Step 5: deliberately malformed input -- must fail honestly, not silently ──
    const badMsg = 'Schedule a commitment: Malformed Date Test at frobnicate zeensday';
    const badResult = await sendAndWaitForReply(page, badMsg);
    report.steps.malformed_input = badResult;
    await page.screenshot({ path: path.join(SHOT_DIR, '03-malformed-input.png') });
    // Check whether a garbage record got silently created
    const apiCheckAfterBad = await page.evaluate(async (base) => {
      const r = await CTX.fetchWithAuth(`${base}/api/v1/lifeos/commitments?user=adam`);
      const d = await r.json().catch(() => ({}));
      return (d.commitments || []).some((c) => JSON.stringify(c).includes('Malformed Date Test'));
    }, BASE);
    report.steps.malformed_input_no_silent_record = { ok: !apiCheckAfterBad };
    if (apiCheckAfterBad) {
      report.findings.push({
        severity: 'bug',
        summary: 'A commitment with an unparseable date/time was silently recorded anyway',
        failure_scenario: `Sent "${badMsg}" -- a real record titled/containing "Malformed Date Test" appeared in GET /commitments despite no valid date`,
        proposed_solution: 'parseNaturalLanguage in lifeos-commitment-service.js should reject or ask for clarification when no valid date/time token is found, not default to a fallback time',
      });
    }

    report.ok = Boolean(
      report.steps.authenticated_load?.ok &&
      report.steps.drawer_opened?.ok &&
      createResult.replied_in_time &&
      chairSeesIt &&
      dashboardSeesIt,
    );
  } catch (err) {
    report.error = err.message;
    report.ok = false;
    await page.screenshot({ path: path.join(SHOT_DIR, '99-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }

  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
