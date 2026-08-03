#!/usr/bin/env node
/**
 * SYNOPSIS: Real-browser Lumin chat walkthrough — mints a session from the Railway
 * vault (never touches the password), opens the actual Lumin drawer a real client
 * would click, sends a real message, captures the real rendered reply, and tries
 * one break case (empty send). SO-002 Layer B: screenshots + concrete findings.
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
const RECEIPT = path.join(ROOT, 'products/receipts/COMMUNICATION_UX_WALKTHROUGH.json');
const SHOT_DIR = path.join(ROOT, 'products/receipts/communication_ux_screenshots');
const TIMEOUT = 45_000;

// Same list live in data/twins/default/adam/communication.json banned_phrases —
// a real reply containing these is a UX regression, not a style nitpick.
const BANNED_PHRASES = [
  'as an ai language model',
  'great question!',
  "i'd be happy to help with that!",
  'let me break this down for you',
];

function writeReceipt(report) {
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
}

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

async function main() {
  const report = {
    schema: 'communication_ux_walkthrough_v1',
    at: new Date().toISOString(),
    base: BASE,
    ok: false,
    findings: [],
    steps: {},
  };

  if (!KEY) {
    report.error = 'COMMAND_CENTER_KEY required to mint a browser session';
    writeReceipt(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  let session;
  try {
    session = await mintBrowserSession();
    report.steps.mint_session = { ok: true, cred_source: session.cred_source, user: session.user };
  } catch (e) {
    report.steps.mint_session = { ok: false, error: e.message };
    writeReceipt(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Inject the minted token before any app script runs — this is the same
    // localStorage contract lifeos-app.html itself reads at boot (line ~2852).
    await context.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('lifeos_access_token', access);
        if (refresh) localStorage.setItem('lifeos_refresh_token', refresh);
      },
      { access: session.access_token, refresh: session.refresh_token || '' },
    );

    await page.goto(`${BASE}/overlay/lifeos-app.html?direct_system=1`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    await page.waitForTimeout(1500); // let bootAccountSession() settle
    const onApp = /lifeos-app\.html/i.test(page.url());
    report.steps.authenticated_load = { ok: onApp, url: page.url() };
    if (!onApp) {
      report.findings.push({
        severity: 'blocker',
        summary: 'Minted session did not reach the app — redirected to login',
        proposed_solution: 'Check mint-browser-session token shape vs bootAccountSession() localStorage keys in lifeos-app.html',
      });
      throw new Error('did not reach app');
    }

    // `direct_system=1` (the exact param the real login page redirects new
    // sessions to) auto-opens the drawer via a 150ms setTimeout — this is the
    // real golden path, not a manual FAB click. Confirmed by reading the
    // source (public/overlay/lifeos-app.html ~line 3007) before assuming.
    const alreadyOpen = await page.locator('#lumin-drawer.open').count();
    if (!alreadyOpen) {
      await page.click('#lumin-fab', { timeout: TIMEOUT });
    }
    await page.waitForSelector('#lumin-drawer.open', { timeout: TIMEOUT });
    report.steps.drawer_opened = { ok: true, auto_opened: Boolean(alreadyOpen) };
    await page.screenshot({ path: path.join(SHOT_DIR, '01-drawer-open.png') });

    // Break case first (cheap, no server round trip expected): empty send must no-op.
    const preCount = await page.locator('.lumin-msg').count();
    await page.click('#lumin-send-btn');
    await page.waitForTimeout(600);
    const postCount = await page.locator('.lumin-msg').count();
    report.steps.empty_send_noop = { ok: postCount === preCount, pre: preCount, post: postCount };
    if (postCount !== preCount) {
      report.findings.push({
        severity: 'bug',
        summary: 'Clicking Send with an empty input created a message bubble',
        proposed_solution: 'luminSend() already guards `if ((!msg && !hasAttachments)) return;` at public/overlay/lifeos-app.html:4136 — check lumin-send-btn onclick is actually calling luminSend() with no stray args bypassing the guard',
      });
    }

    // Real message — deliberately exercises twin/context recall, not a canned probe.
    // This is a real, live account with real conversation history already loaded
    // (80 pre-existing messages observed on this run) -- "wait for last assistant
    // message to be non-empty" would resolve instantly against stale history, not
    // a new reply. Must wait for the assistant message COUNT to increase instead.
    const preAssistantCount = await page.locator('.lumin-msg.assistant').count();
    const question = 'In one or two sentences: based on what you actually know about me, what should I focus on first today?';
    await page.fill('#lumin-input', question);
    await page.click('#lumin-send-btn');
    report.steps.message_sent = { ok: true, text: question, pre_assistant_count: preAssistantCount };

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
        preAssistantCount,
        { timeout: 60_000 },
      );
      repliedInTime = true;
      // Message bubbles render as [content div][.lumin-msg-time div] siblings with
      // no separator -- plain .textContent() runs them together (e.g. "...?02:47 AM").
      // Exclude the timestamp node to get the real reply text alone.
      replyText = await page.locator('.lumin-msg.assistant').last().evaluate((el) => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.lumin-msg-time').forEach((t) => t.remove());
        return clone.textContent || '';
      });
    } catch {
      repliedInTime = false;
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOT_DIR, '02-after-reply.png') });

    report.steps.reply = {
      ok: repliedInTime && replyText.trim().length > 0,
      replied_in_time: repliedInTime,
      text: replyText.trim(),
      length: replyText.trim().length,
    };

    if (!repliedInTime) {
      report.findings.push({
        severity: 'blocker',
        summary: 'No assistant reply appeared within 60s of a real question through the actual UI',
        proposed_solution: 'Check founder-interface/message async job polling (pollFounderBuildJob) — confirm job_id path completes for conversational_mode:true, not just build actions',
      });
    } else {
      const lower = replyText.toLowerCase();
      const hitBanned = BANNED_PHRASES.filter((p) => lower.includes(p));
      if (hitBanned.length) {
        report.findings.push({
          severity: 'ux',
          summary: `Reply contains a banned phrase from communication.json: ${hitBanned.join(', ')}`,
          proposed_solution: 'Trace why the live reply bypassed the banned_phrases filter already defined in data/twins/default/adam/communication.json — either the filter is not applied post-generation, or only used as a prompt instruction (unenforced)',
        });
      }
      if (replyText.trim().length < 15) {
        report.findings.push({
          severity: 'ux',
          summary: 'Reply was suspiciously short for an open reflective question',
          proposed_solution: 'Inspect the actual prompt_context sent for this turn (GET /api/v1/lifeos/lumin/me) to confirm twin facets were populated, not falling back to the empty template',
        });
      }
    }

    report.ok = Boolean(
      report.steps.authenticated_load?.ok &&
      report.steps.drawer_opened?.ok &&
      report.steps.empty_send_noop?.ok &&
      report.steps.reply?.ok,
    );
  } catch (err) {
    report.error = err.message;
    report.ok = false;
    await page.screenshot({ path: path.join(SHOT_DIR, '99-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }

  writeReceipt(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
