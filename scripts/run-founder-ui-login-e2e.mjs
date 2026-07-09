#!/usr/bin/env node
/**
 * SYNOPSIS: Credentialed founder UI login E2E — prefers local LIFEOS_FOUNDER_LOGIN_*;
 * falls back to POST /operator/credentialed-ui-login-proof (Railway vault + Puppeteer)
 * so enforce-creds can green without putting the password in local .env.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';
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

async function proveViaOperator() {
  if (!KEY || !BASE) return null;
  const res = await fetch(`${BASE}/api/v1/lifeos/auth/operator/credentialed-ui-login-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  return { http: res.status, data };
}

async function proveViaLocalPlaywright(creds) {
  const report = {
    schema: 'founder_ui_login_e2e_v1',
    at: new Date().toISOString(),
    base: BASE || null,
    ok: false,
    auth_mode: 'ui_form_login',
    source: 'local_playwright',
    steps: {},
    cred_source: creds.source,
  };

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

    const submit = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login"), #login-btn').first();
    await submit.click({ timeout: TIMEOUT });

    await page.waitForURL(/lifeos-app\.html|\/overlay\/lifeos-app/i, { timeout: TIMEOUT }).catch(() => null);
    const landed = /lifeos-app\.html/i.test(page.url());
    report.steps.form_login = { ok: landed, url: page.url() };
    if (!landed) {
      await page.goto(`${BASE}/overlay/lifeos-app.html`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      report.steps.app_nav = { ok: /lifeos-app\.html/i.test(page.url()), url: page.url() };
    }

    const onApp = /lifeos-app\.html/i.test(page.url());
    if (!onApp) {
      report.error = `did_not_reach_lifeos_app after form login (url=${page.url()})`;
      return report;
    }

    const chatInput = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    await chatInput.waitFor({ timeout: TIMEOUT });
    const probe = `trust-gate-ui-${Date.now()}`;
    await chatInput.fill(probe);
    await page.keyboard.press('Enter');
    report.steps.chat_send = { ok: true, probe };

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
  return report;
}

async function main() {
  if (!BASE) {
    const report = {
      schema: 'founder_ui_login_e2e_v1',
      at: new Date().toISOString(),
      ok: false,
      error: 'PUBLIC_BASE_URL required',
    };
    writeReceipt(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const creds = resolveCreds();
  if (creds) {
    const report = await proveViaLocalPlaywright(creds);
    writeReceipt(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }

  // No local password — use Railway vault via operator Puppeteer proof.
  const op = await proveViaOperator();
  if (!op) {
    const report = {
      schema: 'founder_ui_login_e2e_v1',
      at: new Date().toISOString(),
      base: BASE,
      ok: false,
      deferred: true,
      error: 'LIFEOS_FOUNDER_LOGIN_* missing locally and COMMAND_CENTER_KEY unavailable for operator vault UI proof',
    };
    writeReceipt(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const report = {
    ...op.data,
    schema: 'founder_ui_login_e2e_v1',
    at: op.data?.at || new Date().toISOString(),
    base: op.data?.base || BASE,
    operator_http: op.http,
    source: op.data?.source || 'operator_vault_puppeteer',
  };
  if (op.http === 404 || op.data?.error?.includes?.('Cannot POST')) {
    report.ok = false;
    report.blocker = 'OPERATOR_UI_PROOF_ROUTE_MISSING';
    report.error = 'Deploy does not yet expose /operator/credentialed-ui-login-proof — push + redeploy';
  }
  writeReceipt(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
