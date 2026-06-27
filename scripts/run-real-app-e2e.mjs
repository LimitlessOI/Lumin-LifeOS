#!/usr/bin/env node
/**
 * SYNOPSIS: Real-app E2E — Playwright drives the actual Railway UI like a founder would.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE    = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY     = process.env.COMMAND_CENTER_KEY || '';
const TIMEOUT = 30_000;

if (!BASE || !KEY) {
  console.error('PUBLIC_BASE_URL and COMMAND_CENTER_KEY required');
  process.exit(1);
}

// Mint a valid E2E access token — same algorithm as lifeos-auth.js (HMAC-SHA256, base64url)
function mintE2EToken() {
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now    = Math.floor(Date.now() / 1000);
  const header  = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    handle: 'adam',
    role:   'admin',
    tier:   'founder',
    iat:    now,
    exp:    now + 86400,
  });
  const sig = crypto
    .createHmac('sha256', KEY)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const SCREENSHOTS = path.join(ROOT, 'products/receipts/e2e-screenshots');
fs.mkdirSync(SCREENSHOTS, { recursive: true });

const report = {
  schema:    'real_app_e2e_v1',
  at:        new Date().toISOString(),
  base:      BASE,
  ok:        false,
  passed:    [],
  failed:    [],
  results:   {},
};

let browser;
let page;
let errors = [];

function pass(id, detail = '') {
  report.passed.push(id);
  report.results[id] = { ok: true, detail };
  console.log(`  ✅ ${id}${detail ? ' — ' + detail : ''}`);
}

function fail(id, detail = '') {
  report.failed.push(id);
  report.results[id] = { ok: false, detail };
  console.log(`  ❌ ${id} — ${detail}`);
}

async function shot(name) {
  try {
    await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: false });
  } catch { /* non-fatal */ }
}

async function waitForText(selector, timeoutMs = TIMEOUT) {
  const el = await page.waitForSelector(selector, { timeout: timeoutMs, state: 'visible' });
  return el;
}

async function injectAuth() {
  const token = mintE2EToken();
  await page.evaluate(({ k, t }) => {
    localStorage.setItem('commandKey',            k);
    localStorage.setItem('command_key',           k);
    localStorage.setItem('lifeos_key',            k);
    localStorage.setItem('lifeos_access_token',   t);
    localStorage.setItem('lifeos_user',           'adam');
    localStorage.setItem('lifeos_role',           'admin');
    localStorage.setItem('lifeos_tier',           'founder');
  }, { k: KEY, t: token });
}

// First load uses commandKey in URL — server sets httpOnly cookie and redirects clean
// All subsequent navigations use the cookie automatically
let sessionBootstrapped = false;
async function appUrl(pageName) {
  const p = pageName ? `&page=${encodeURIComponent(pageName)}` : '';
  if (!sessionBootstrapped) {
    sessionBootstrapped = true;
    return `${BASE}/lifeos?layout=desktop&direct_system=1&commandKey=${encodeURIComponent(KEY)}${p}`;
  }
  return `${BASE}/lifeos?layout=desktop&direct_system=1${p}`;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function sendLuminMessage(text, waitForReply = true) {
  const input = page.locator('#lumin-input');
  await input.click();
  await input.fill(text);
  await page.locator('#lumin-send-btn').click();
  if (!waitForReply) return null;
  // Wait until "Lumin is working…" thinking bubble disappears and a real reply appears
  await page.waitForFunction(() => {
    const msgs = document.querySelectorAll('.lumin-msg.assistant:not(.thinking)');
    return msgs.length > 0 && !document.querySelector('.lumin-msg.thinking');
  }, { timeout: TIMEOUT });
  const lastReply = await page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.lumin-msg.assistant:not(.thinking)')];
    return msgs[msgs.length - 1]?.innerText?.trim() || '';
  });
  return lastReply;
}

async function sendLuminBuildMessage(text) {
  const input = page.locator('#lumin-input');
  await input.click();
  await input.fill(text);
  await page.locator('#lumin-send-btn').click();
  await page.waitForFunction(() => {
    const msgs = document.querySelectorAll('.lumin-msg.assistant:not(.thinking)');
    return msgs.length > 0 && !document.querySelector('.lumin-msg.thinking');
  }, { timeout: 330_000 });
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.lumin-msg.assistant:not(.thinking)')];
    return msgs[msgs.length - 1]?.innerText?.trim() || '';
  });
}

// ── tests ────────────────────────────────────────────────────────────────────

async function test_appLoads() {
  console.log('\n[1] App shell loads');
  try {
    // addInitScript already seeds localStorage before JS runs — single navigation is enough
    const res = await page.goto(await appUrl(), { waitUntil: 'load', timeout: TIMEOUT });
    const status = res?.status() ?? 0;
    if (status >= 400) { fail('app_loads', `HTTP ${status}`); return false; }
    const title = await page.title();
    await shot('01-app-loaded');
    pass('app_loads', `HTTP ${status}, title="${title}"`);
    return true;
  } catch (e) { fail('app_loads', e.message); return false; }
}

async function test_noJsErrors() {
  console.log('\n[2] No JS console errors on load');
  const fatal = errors.filter((e) => e.type === 'pageerror');
  if (fatal.length) {
    fail('no_js_errors', fatal.map((e) => e.text.slice(0, 120)).join('; '));
  } else {
    pass('no_js_errors', `${errors.filter((e) => e.type === 'console_error').length} console.error(s)`);
  }
}

async function test_luminFabVisible() {
  console.log('\n[3] Lumin FAB visible');
  try {
    await waitForText('#lumin-fab');
    const visible = await page.locator('#lumin-fab').isVisible();
    if (visible) pass('lumin_fab_visible');
    else fail('lumin_fab_visible', 'FAB not visible');
  } catch (e) { fail('lumin_fab_visible', e.message); }
}

async function test_luminDrawerOpens() {
  console.log('\n[4] Lumin drawer opens');
  try {
    // App auto-opens the drawer on direct_system=1 (150ms after load)
    // Wait up to 3s for the auto-open, then try clicking FAB if still closed
    await page.waitForFunction(() => {
      return document.querySelector('.lumin-drawer')?.classList.contains('open');
    }, { timeout: 3000 }).catch(async () => {
      // Auto-open didn't fire — click FAB to open
      await page.locator('#lumin-fab').click();
      await page.waitForFunction(() => {
        return document.querySelector('.lumin-drawer')?.classList.contains('open');
      }, { timeout: 5000 });
    });
    await shot('02-drawer-open');
    pass('lumin_drawer_opens');
  } catch (e) { fail('lumin_drawer_opens', e.message); }
}

async function ensureDrawerOpen() {
  const isOpen = await page.evaluate(() => document.querySelector('.lumin-drawer')?.classList.contains('open'));
  if (!isOpen) {
    await page.locator('#lumin-fab').click();
    await page.waitForFunction(() => document.querySelector('.lumin-drawer')?.classList.contains('open'), { timeout: 5000 });
  }
}

async function test_chatResponse() {
  console.log('\n[5] Chat: real reply arrives for a counsel question');
  try {
    await ensureDrawerOpen();
    const reply = await sendLuminMessage('what is point b right now?');
    await shot('03-chat-reply');
    if (!reply || reply.length < 20) {
      fail('chat_response', `reply too short: "${reply?.slice(0, 80)}"`);
    } else if (/lumin is working|thinking|error/i.test(reply)) {
      fail('chat_response', `got error or spinner text: "${reply.slice(0, 80)}"`);
    } else {
      pass('chat_response', `${reply.length} chars: "${reply.slice(0, 80)}…"`);
    }
  } catch (e) { fail('chat_response', e.message); }
}

async function test_smosQuestion() {
  console.log('\n[6] Chat: SMOS question returns workflow content (not search bleed)');
  try {
    const reply = await sendLuminMessage('what does our Social Media OS workflow look like for relocation content?');
    await shot('04-smos-reply');
    const hasWorkflow = /brief|coach|record|post|publish/i.test(reply);
    const hasBleed = /live search unavailable|verified web search.*should i prioritize/i.test(reply);
    if (hasBleed) {
      fail('smos_question', `search bleed: "${reply.slice(0, 120)}"`);
    } else if (!hasWorkflow) {
      fail('smos_question', `no workflow content: "${reply.slice(0, 120)}"`);
    } else {
      pass('smos_question', `workflow present, no bleed`);
    }
  } catch (e) { fail('smos_question', e.message); }
}

async function test_counselOnlyBypass() {
  console.log('\n[7] Chat: counsel-only instruction does not trigger build');
  try {
    const reply = await sendLuminMessage('explain how BuilderOS implements a change — counsel only, do not run a build');
    await shot('05-counsel-only');
    const ranBuild = /build_terminal|code_execute|build started|job_id/i.test(reply);
    const hasContent = /build|builder|council|commit|build_async/i.test(reply);
    if (ranBuild) {
      fail('counsel_only_bypass', `triggered build when it should not: "${reply.slice(0, 120)}"`);
    } else if (!hasContent) {
      fail('counsel_only_bypass', `thin answer, no builder content: "${reply.slice(0, 120)}"`);
    } else {
      pass('counsel_only_bypass', `counseled without running build`);
    }
  } catch (e) { fail('counsel_only_bypass', e.message); }
}

async function test_directBuildFromDrawer() {
  console.log('\n[8] Drawer build: founder build/fix order executes through live UI path');
  try {
    await ensureDrawerOpen();
    const stamp = new Date().toISOString();
    const reply = await sendLuminBuildMessage(
      `do: in scripts/lifeos-direct-build-smoke-test.mjs set or replace one comment line exactly "// ui-e2e-build-proof: ${stamp}" near the top. Do not change runtime behavior and do not modify any other file.`,
    );
    await shot('06-direct-build-ui');
    const looksExecuted = /PASS|RUNNING|COMMIT|Command:\s*COMMAND_RAN|Build job/i.test(reply);
    const hasFailure = /FAIL|Blocker:/i.test(reply);
    if (hasFailure) {
      fail('drawer_direct_build', `build failed: "${reply.slice(0, 220)}"`);
    } else if (!looksExecuted) {
      fail('drawer_direct_build', `no execution proof in reply: "${reply.slice(0, 220)}"`);
    } else {
      pass('drawer_direct_build', reply.slice(0, 140).replace(/\s+/g, ' '));
    }
  } catch (e) { fail('drawer_direct_build', e.message); }
}

async function test_navigateToLifeRE() {
  console.log('\n[9] Navigate to LifeRE page');
  try {
    await page.goto(await appUrl('lifeos-lifere.html'), { waitUntil: 'load', timeout: TIMEOUT });
    // LifeRE content loads inside #content-frame iframe — use frameLocator
    const frame = page.frameLocator('#content-frame');
    await frame.locator('#lifere-alpha-cycle-btn').waitFor({ state: 'visible', timeout: TIMEOUT });
    await shot('06-lifere-page');
    pass('navigate_lifere', 'LifeRE page loaded with alpha cycle button');
  } catch (e) { fail('navigate_lifere', e.message); }
}

async function test_alphaReadiness() {
  console.log('\n[10] LifeRE alpha readiness surface renders');
  try {
    const frame = page.frameLocator('#content-frame');
    const btn = frame.locator('#lifere-alpha-cycle-btn');
    const btnText = await btn.textContent({ timeout: TIMEOUT });
    pass('alpha_readiness', `alpha cycle btn: "${btnText?.trim()}"`);
  } catch (e) { fail('alpha_readiness', e.message); }
}

async function test_alphaDaily() {
  console.log('\n[11] Alpha daily cycle runs from UI');
  try {
    // Close Lumin drawer if open — its backdrop intercepts clicks in the iframe
    const backdropOpen = await page.evaluate(() => document.getElementById('lumin-backdrop')?.classList.contains('open'));
    if (backdropOpen) await page.evaluate(() => typeof closeLuminDrawer === 'function' && closeLuminDrawer());
    const frame = page.frameLocator('#content-frame');
    await frame.locator('#lifere-alpha-cycle-btn').click();
    // Wait up to 25s for any status update inside the iframe
    let cycleText = '';
    try {
      await frame.locator('#lifere-cycle-status, .status-line, #alpha-confirm-box').first().waitFor({ state: 'visible', timeout: 25_000 });
      cycleText = await frame.locator('#lifere-cycle-status, .status-line, #alpha-confirm-box').first().textContent();
    } catch {
      const confirmVisible = await frame.locator('#alpha-confirm-box').isVisible().catch(() => false);
      cycleText = confirmVisible ? 'confirm-box-visible' : 'no-status-update';
    }
    await shot('07-alpha-cycle-ran');
    if (/error|failed|500/i.test(cycleText)) {
      fail('alpha_daily_cycle', `cycle failed: "${cycleText.slice(0, 120)}"`);
    } else if (/confirm|passed|pass|cycle/i.test(cycleText) || cycleText === 'confirm-box-visible') {
      pass('alpha_daily_cycle', `cycle ran: "${cycleText.slice(0, 120)}"`);
    } else {
      fail('alpha_daily_cycle', `unclear result: "${cycleText.slice(0, 120)}"`);
    }
  } catch (e) { fail('alpha_daily_cycle', e.message); }
}

async function test_dashboardLoads() {
  console.log('\n[12] Dashboard page loads');
  try {
    await page.goto(await appUrl('lifeos-dashboard.html'), { waitUntil: 'load', timeout: TIMEOUT });
    await shot('08-dashboard');
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
    if (bodyText.length < 50) {
      fail('dashboard_loads', `page appears empty: ${bodyText.slice(0, 80)}`);
    } else {
      pass('dashboard_loads', `${bodyText.length} chars visible`);
    }
  } catch (e) { fail('dashboard_loads', e.message); }
}

async function test_pageNav() {
  console.log('\n[13] Page navigation: today / finance / health load');
  const pages = ['lifeos-today.html', 'lifeos-finance.html', 'lifeos-health.html'];
  let allOk = true;
  for (const pg of pages) {
    try {
      const res = await page.goto(await appUrl(pg), { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      const status = res?.status() ?? 0;
      if (status >= 400) { allOk = false; fail(`nav_${pg}`, `HTTP ${status}`); }
    } catch (e) { allOk = false; fail(`nav_${pg}`, e.message); }
  }
  if (allOk) pass('page_nav', `${pages.length} pages loaded cleanly`);
}

async function test_loginPageReachable() {
  console.log('\n[14] Login page reachable (not 404)');
  try {
    const res = await page.goto(`${BASE}/overlay/lifeos-login.html`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    const status = res?.status() ?? 0;
    if (status >= 400) {
      fail('login_page', `HTTP ${status}`);
    } else {
      pass('login_page', `HTTP ${status}`);
    }
  } catch (e) { fail('login_page', e.message); }
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log(`\n🎭 Real-app E2E — ${BASE}`);
console.log('   Driving Chromium against live Railway deploy\n');

browser = await chromium.launch({ headless: true });
const token = mintE2EToken();
const DOMAIN = new URL(BASE).hostname;

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: 'LifeOS-E2E-Runner/1.0',
});

// Set the auth cookie BEFORE any navigation so the server sees it on /lifeos
// Server checks req.cookies['lifeos_access_token'] (httpOnly, secure, sameSite:lax)
await ctx.addCookies([{
  name:     'lifeos_access_token',
  value:    token,
  domain:   DOMAIN,
  path:     '/',
  httpOnly: true,
  secure:   BASE.startsWith('https'),
  sameSite: 'Lax',
}]);

page = await ctx.newPage();

// Intercept all requests to Railway and inject x-command-key header
// setExtraHTTPHeaders alone doesn't always fire on top-level navigations in headless Chromium
await page.route(`${BASE}/**`, async (route) => {
  const headers = { ...route.request().headers(), 'x-command-key': KEY };
  await route.continue({ headers });
});

// Seed localStorage so client-side JS uses the same key for XHR/fetch API calls
await page.addInitScript(({ k, t }) => {
  try {
    localStorage.setItem('commandKey',          k);
    localStorage.setItem('command_key',         k);
    localStorage.setItem('lifeos_key',          k);
    localStorage.setItem('lifeos_access_token', t);
    localStorage.setItem('lifeos_user',         'adam');
    localStorage.setItem('lifeos_role',         'admin');
    localStorage.setItem('lifeos_tier',         'founder');
  } catch { /* storage may be blocked in some contexts */ }
}, { k: KEY, t: token });

page.on('pageerror', (err) => errors.push({ type: 'pageerror', text: err.message }));
page.on('console',   (msg) => {
  if (msg.type() === 'error') errors.push({ type: 'console_error', text: msg.text() });
});

const ok = await test_appLoads();
test_noJsErrors();
if (ok) {
  await test_luminFabVisible();
  await test_luminDrawerOpens();
  await test_chatResponse();
  await test_smosQuestion();
  await test_counselOnlyBypass();
  await test_directBuildFromDrawer();
}
await test_navigateToLifeRE();
await test_alphaReadiness();
await test_alphaDaily();
await test_dashboardLoads();
await test_pageNav();
await test_loginPageReachable();

await browser.close();

report.ok = report.failed.length === 0;
const outPath = path.join(ROOT, 'products/receipts/REAL_APP_E2E.json');
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`\n${'─'.repeat(56)}`);
console.log(`✅ PASSED  ${report.passed.length}`);
if (report.failed.length) {
  console.log(`❌ FAILED  ${report.failed.length}`);
  console.log(`   ${report.failed.join(', ')}`);
}
console.log(`Screenshots → products/receipts/e2e-screenshots/`);
console.log(`Receipt    → products/receipts/REAL_APP_E2E.json`);

process.exit(report.ok ? 0 : 1);
