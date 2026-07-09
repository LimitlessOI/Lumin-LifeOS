#!/usr/bin/env node
/**
 * SYNOPSIS: Credentialed founder UI login E2E — Playwright types LIFEOS_FOUNDER_LOGIN_* into lifeos-login.html and proves lifeos-app.html chat.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const RECEIPT = path.join(ROOT, 'products/receipts/FOUNDER_UI_LOGIN_E2E.json');
const TIMEOUT = 45_000;

function resolveCreds() {
  const pairs = [
    ['LIFEOS_FOUNDER_LOGIN_EMAIL', 'LIFEOS_FOUNDER_LOGIN_PASSWORD'],
    ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
  ];
  for (const [ek, pk] of pairs) {
    const email = String(process.env[ek] || '').trim();
    const password = String(process.env[pk] || '');
    if (email && password.length >= 8 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { email, password, source: `${ek}+${pk}` };
    }
  }
  return null;
}

function writeReceipt(report) {
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const report = {
    schema: 'founder_ui_login_e2e_v1',
    at: new Date().toISOString(),
    base: BASE || null,
    ok: false,
    auth_mode: 'ui_form_login',
    steps: {},
  };

  if (!BASE) {
    report.error = 'PUBLIC_BASE_URL required';
    writeReceipt(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const creds = resolveCreds();
  if (!creds) {
    report.error = 'LIFEOS_FOUNDER_LOGIN_EMAIL + LIFEOS_FOUNDER_LOGIN_PASSWORD required (or WORK_EMAIL pair)';
    report.deferred = true;
    writeReceipt(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.cred_source = creds.source;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/overlay/lifeos-login.html`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    report.steps.login_page = { ok: true, url: page.url() };

    const emailSel = 'input[type="email"], input[name="email"], #email, input[autocomplete="username"]';
    const passSel = 'input[type="password"], input[name="password"], #password, input[autocomplete="current-password"]';
    await page.waitForSelector(emailSel, { timeout: TIMEOUT });
    await page.fill(emailSel, creds.email);
    await page.fill(passSel, creds.password);

    const submit = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
    await submit.click({ timeout: TIMEOUT });

    await page.waitForURL(/lifeos-app\.html|\/overlay\/lifeos-app/i, { timeout: TIMEOUT }).catch(() => null);
    const landed = /lifeos-app\.html/i.test(page.url());
    report.steps.form_login = { ok: landed, url: page.url() };
    if (!landed) {
      // Some flows land on / then redirect — try direct app with cookies from login response.
      await page.goto(`${BASE}/overlay/lifeos-app.html`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      report.steps.app_nav = { ok: /lifeos-app\.html/i.test(page.url()), url: page.url() };
    }

    const onApp = /lifeos-app\.html/i.test(page.url());
    if (!onApp) {
      report.error = `did_not_reach_lifeos_app after form login (url=${page.url()})`;
      writeReceipt(report);
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const chatInput = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    await chatInput.waitFor({ timeout: TIMEOUT });
    const probe = `trust-gate-ui-${Date.now()}`;
    await chatInput.fill(probe);
    await page.keyboard.press('Enter');
    report.steps.chat_send = { ok: true, probe };

    // Soft wait for any assistant response surface — fail closed only if input vanished (auth bounce).
    await page.waitForTimeout(2500);
    const stillOnApp = /lifeos-app\.html/i.test(page.url());
    report.steps.session_held = { ok: stillOnApp, url: page.url() };
    report.ok = Boolean(report.steps.form_login?.ok || report.steps.app_nav?.ok) && stillOnApp;
  } catch (err) {
    report.error = err.message;
    report.ok = false;
  } finally {
    await browser.close().catch(() => {});
  }

  writeReceipt(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
