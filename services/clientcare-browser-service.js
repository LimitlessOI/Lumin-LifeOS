/**
 * SYNOPSIS: clientcare-browser-service.js
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 * clientcare-browser-service.js
 * Browser-first fallback contract and discovery automation for ClientCare when API access is unavailable.
 */

import path from 'path';
import fs from 'fs/promises';
import { createSession } from './browser-agent.js';

const SCREENSHOT_DIR = '/tmp/clientcare-browser';
const REQUIRED_BROWSER_SECRETS = [
  'CLIENTCARE_BASE_URL',
  'CLIENTCARE_USERNAME',
  'CLIENTCARE_PASSWORD',
];
const OPTIONAL_BROWSER_SECRETS = [
  'CLIENTCARE_MFA_MODE',
  'CLIENTCARE_MFA_SECRET',
  'CLIENTCARE_VOB_BUTTON_HINT',
  'CLIENTCARE_VOB_INNER_ATTEMPTS',
  'CLIENTCARE_VOB_RETRY_ROUNDS',
];
const WORKFLOW_TEMPLATES = [
  {
    id: 'claim-aging-export',
    title: 'Export claim aging report',
    goal: 'Get the full unpaid and aging inventory into the rescue queue.',
    steps: [
      'Log into ClientCare West billing area.',
      'Open claim aging or accounts receivable report.',
      'Filter for unpaid or outstanding claims.',
      'Export CSV or spreadsheet.',
      'Upload the export into LifeOS billing rescue import.',
    ],
  },
  {
    id: 'rejected-claims-export',
    title: 'Export rejected claims',
    goal: 'Identify claims that can often be corrected and resubmitted quickly.',
    steps: [
      'Open rejected claims or clearinghouse errors view.',
      'Export all open rejected items.',
      'Include rejection reason and original submission date if available.',
      'Import into rescue queue.',
    ],
  },
  {
    id: 'denied-claims-export',
    title: 'Export denied claims',
    goal: 'Separate correctable denials from late or likely-dead balances.',
    steps: [
      'Open denied claims report.',
      'Export denial code, denial reason, payer, date of service, billed amount, and paid amount.',
      'Import into rescue queue.',
    ],
  },
  {
    id: 'unbilled-encounters-export',
    title: 'Export unbilled encounters',
    goal: 'Catch work performed but never converted into submitted claims.',
    steps: [
      'Open unbilled encounters, superbills, or pending claims list.',
      'Export all rows with DOS, patient, payer, codes, and charge amount.',
      'Import into rescue queue.',
    ],
  },
];
const USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[name*="user" i]',
  'input[id*="user" i]',
  'input[name*="login" i]',
  'input[id*="login" i]',
  'input[type="text"]',
];
const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name*="pass" i]',
  'input[id*="pass" i]',
];
const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button[name*="login" i]',
  'button[id*="login" i]',
  'button[class*="login" i]',
  'button[class*="sign" i]',
];
const BILLING_KEYWORDS = /billing|claim|claims|invoice|insurance|ar\b|accounts receivable|denial|rejection|payment|era|eob/i;
const CLIENT_LINK_PATTERN = /\/Pregnancy\/ShowDefaultClientScreen\//i;

function redact(value = '') {
  const text = String(value || '');
  if (text.length <= 8) return `${text.slice(0, 2)}****`;
  return `${text.slice(0, 4)}****${text.slice(-2)}`;
}

async function ensureScreenshotDir() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function screenshotPath(label) {
  await ensureScreenshotDir();
  return path.join(SCREENSHOT_DIR, `${Date.now()}-${label.replace(/[^a-z0-9_-]/gi, '_')}.png`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evaluateWithTimeout(page, pageFunction, arg, timeoutMs = 45000) {
  const run = arguments.length >= 3 && arg !== undefined
    ? page.evaluate(pageFunction, arg)
    : page.evaluate(pageFunction);
  return Promise.race([
    run,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`page.evaluate timed out after ${timeoutMs}ms`)), Math.max(1000, Number(timeoutMs) || 45000));
    }),
  ]);
}

async function waitForCondition(fn, { timeoutMs = 10000, intervalMs = 500 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await fn();
      if (result) return true;
    } catch (_) {
      // best-effort polling only
    }
    await sleep(intervalMs);
  }
  return false;
}

async function safeScreenshot(page, targetPath) {
  try {
    const dims = await page.evaluate(() => ({
      width: Math.max(
        document.documentElement?.scrollWidth || 0,
        document.documentElement?.clientWidth || 0,
        window.innerWidth || 0,
        document.body?.scrollWidth || 0,
        document.body?.clientWidth || 0
      ),
      height: Math.max(
        document.documentElement?.scrollHeight || 0,
        document.documentElement?.clientHeight || 0,
        window.innerHeight || 0,
        document.body?.scrollHeight || 0,
        document.body?.clientHeight || 0
      ),
    })).catch(() => ({ width: 0, height: 0 }));

    const width = Math.max(1280, Number(dims.width) || 0);
    const height = Math.max(800, Number(dims.height) || 0);
    await page.setViewport({ width: Math.min(width, 1600), height: Math.min(height, 2400) }).catch(() => {});

    await page.screenshot({
      path: targetPath,
      fullPage: width > 0 && height > 0,
    });
  } catch (error) {
    // Screenshot failures are diagnostic only — never block the billing workflow.
  }
}

async function dismissSessionTakeover(page) {
  try {
    const clicked = await evaluateWithTimeout(page, () => {
      const text = (document.body?.innerText || '');
      if (!/logged into another computer|use this computer now/i.test(text)) return false;
      const btn = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
        .find((el) => /use this computer now/i.test((el.textContent || el.value || '').trim()));
      if (!btn) return false;
      btn.click();
      return true;
    }, undefined, 5000);
    if (clicked) await sleep(800);
    return { clicked: Boolean(clicked) };
  } catch (_) {
    return { clicked: false };
  }
}

async function gotoWithBudget(page, href, { timeout = 20000 } = {}) {
  const budget = Math.max(5000, Number(timeout) || 20000);
  try {
    await Promise.race([
      (async () => {
        await page.goto(href, { waitUntil: 'domcontentloaded', timeout: budget });
        await sleep(500);
        await dismissSessionTakeover(page);
      })(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`gotoWithBudget hard timeout after ${budget + 3000}ms`)), budget + 3000);
      }),
    ]);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function formatMmDdYyyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function parseMmDdYyyy(raw) {
  const m = String(raw || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildVisitDateCandidates({ visitDate = null, visitDates = [], scanDays = 14 } = {}) {
  const out = [];
  const push = (v) => {
    const s = String(v || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };
  push(visitDate);
  for (const d of visitDates || []) push(d);
  const center = parseMmDdYyyy(visitDate) || new Date();
  const span = Math.max(0, Math.min(Number(scanDays) || 0, 45));
  for (let i = 0; i <= span; i += 1) {
    const a = new Date(center);
    a.setDate(center.getDate() - i);
    push(formatMmDdYyyy(a));
    if (i === 0) continue;
    const b = new Date(center);
    b.setDate(center.getDate() + i);
    push(formatMmDdYyyy(b));
  }
  return out;
}

async function tryFill(page, selectors, value) {
  for (const selector of selectors) {
    const el = await page.$(selector);
    if (!el) continue;
    await el.click({ clickCount: 3 }).catch(() => {});
    await el.type(String(value), { delay: 20 });
    return selector;
  }
  return null;
}

async function tryClick(page, selectors) {
  for (const selector of selectors) {
    const el = await page.$(selector);
    if (!el) continue;
    await el.click().catch(() => {});
    return selector;
  }
  return null;
}

async function collectPageSummary(page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 500).map((el) => ({
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      href: el.href || '',
    }));
    const candidates = links.filter((item) => /billing|claim|claims|invoice|insurance|ar\b|accounts receivable|denial|rejection|payment|era|eob/i.test(`${item.text} ${item.href}`)).slice(0, 20);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map((el) => (el.textContent || '').trim()).filter(Boolean).slice(0, 20);
    const tables = Array.from(document.querySelectorAll('table')).slice(0, 5).map((table) =>
      Array.from(table.querySelectorAll('tr')).slice(0, 20).map((row) =>
        Array.from(row.querySelectorAll('th,td')).map((cell) => (cell.textContent || '').trim())
      )
    );
    const labelOf = (el) => (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn, .btn'))
      .map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type') || null,
        id: el.id || null,
        name: el.getAttribute('name') || null,
        text: labelOf(el),
        onclick: (el.getAttribute('onclick') || '').slice(0, 160),
        href: el.tagName === 'A' ? (el.getAttribute('href') || '').slice(0, 160) : null,
      }))
      .filter((b) => b.text || b.id || b.onclick)
      .slice(0, 120);
    const inputs = Array.from(document.querySelectorAll('input, textarea'))
      .map((el) => ({
        tag: el.tagName,
        type: el.type || el.getAttribute('type') || null,
        id: el.id || null,
        name: el.name || null,
        placeholder: (el.placeholder || '').slice(0, 80),
        value: (el.type === 'password' ? '' : String(el.value || '')).slice(0, 80),
        checked: el.type === 'checkbox' || el.type === 'radio' ? Boolean(el.checked) : null,
      }))
      .slice(0, 150);
    const selects = Array.from(document.querySelectorAll('select'))
      .map((el) => ({
        id: el.id || null,
        name: el.name || null,
        optionCount: el.options?.length || 0,
        selected: (el.options?.[el.selectedIndex]?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        options: Array.from(el.options || []).slice(0, 20).map((o) => (o.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)),
      }))
      .slice(0, 40);
    const tabs = Array.from(document.querySelectorAll('.nav-tabs a, [role="tab"], a[data-toggle="tab"], ul.nav a'))
      .map((el) => ({ text: labelOf(el), href: (el.getAttribute('href') || '').slice(0, 120), id: el.id || null }))
      .filter((t) => t.text)
      .slice(0, 40);
    return {
      url: location.href,
      title: document.title,
      headings,
      candidateLinks: candidates,
      allLinks: links.slice(0, 100),
      tables,
      buttons,
      inputs,
      selects,
      tabs,
      textPreview: (document.body.innerText || '').trim().slice(0, 3000),
    };
  });
}

async function extractClientDirectory(page, limit = 10) {
  return page.evaluate((maxItems) => {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map((el) => ({
        text: (el.textContent || '').trim().replace(/\s+/g, ' '),
        href: el.href || '',
      }))
      .filter((item) => /\/Pregnancy\/ShowDefaultClientScreen\//i.test(item.href));

    const unique = [];
    const seen = new Set();
    for (const link of links) {
      if (!link.href || seen.has(link.href)) continue;
      seen.add(link.href);
      const text = link.text || '';
      const mrnMatch = text.match(/MRN#?:?\s*([0-9]+)/i);
      unique.push({
        href: link.href,
        rawText: text,
        name: text.split('MRN#:')[0].trim() || text,
        mrn: mrnMatch ? mrnMatch[1] : null,
      });
      if (unique.length >= maxItems) break;
    }
    return unique;
  }, Math.max(1, Math.min(Number(limit) || 10, 500)));
}

/**
 * Client list defaults to Active Due Date window (future pregnancies only).
 * Past births require Clear filter / View all or All Clients before scrape.
 */
async function prepareClientDirectoryForSearch(page) {
  const clicked = await clickDirectoryFilterHints(page);
  if (clicked?.clicked) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Prefer typing into Filter if present (name search).
  const filterReady = await page.evaluate(() => {
    const input =
      document.querySelector('input[placeholder*="Filter" i]') ||
      document.querySelector('input[aria-label*="Filter" i]') ||
      document.querySelector('.k-filter-row input') ||
      document.querySelector('input[type="search"]') ||
      Array.from(document.querySelectorAll('input[type="text"]')).find((el) => {
        const near = (el.closest('div,td,th,label')?.innerText || '').slice(0, 40);
        return /filter/i.test(near);
      });
    return Boolean(input);
  });

  return { ...clicked, filterInputPresent: filterReady };
}

async function typeClientDirectoryFilter(page, query) {
  const q = String(query || '').trim();
  if (!q) return { typed: false };
  const typed = await page.evaluate((searchText) => {
    const input =
      document.querySelector('input[placeholder*="Filter" i]') ||
      document.querySelector('input[aria-label*="Filter" i]') ||
      document.querySelector('.k-filter-row input') ||
      document.querySelector('input[type="search"]') ||
      Array.from(document.querySelectorAll('input[type="text"]')).find((el) => {
        const near = (el.closest('div,td,th,label')?.innerText || '').slice(0, 40);
        return /filter|client/i.test(near);
      });
    if (!input) return { typed: false };
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = searchText;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    return { typed: true };
  }, q);
  if (typed?.typed) await new Promise((r) => setTimeout(r, 1800));
  return typed;
}

function normalizeDirectoryName(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function scoreDirectoryClientMatch(query = '', candidate = '') {
  const q = String(query || '').trim().toLowerCase();
  const c = String(candidate || '').trim().toLowerCase();
  if (!q || !c) return 0;
  const nq = normalizeDirectoryName(q);
  const nc = normalizeDirectoryName(c);
  if (!nq || !nc) return 0;
  if (nq === nc) return 100;
  if (nc.includes(nq) || nq.includes(nc)) return 80;
  const qParts = q.split(/\s+/).filter((part) => part.length >= 2);
  if (!qParts.length) return 0;
  const matches = qParts.filter((part) => c.includes(part)).length;
  if (matches === qParts.length && qParts.length >= 2) return 70;
  if (matches >= 2) return 55;
  if (matches === 1 && qParts.length === 1) return 40;
  return 0;
}

function pregnancyIdFromAnyHref(href = '') {
  const h = String(href || '');
  const m = h.match(/ShowDefaultClientScreen\/([0-9a-f-]{36})/i)
    || h.match(/\/Pregnancy\/Billing\/([0-9a-f-]{36})/i)
    || h.match(/[?&]pregnancyID=([0-9a-f-]{36})/i)
    || h.match(/[?&]PregnancyID=([0-9a-f-]{36})/i);
  return m?.[1] || null;
}

function deriveBillingHrefFromClientHref(clientHref = '') {
  const href = String(clientHref || '').trim();
  if (!href) return '';
  const id = pregnancyIdFromAnyHref(href);
  if (!id) return '';
  try {
    const url = new URL(href);
    return `${url.origin}/Pregnancy/Billing/${id}`;
  } catch {
    return `https://clientcarewest.net/Pregnancy/Billing/${id}`;
  }
}

/**
 * Past / completed pregnancies often leave Active Clients. Prefer Advanced Client List
 * + Birth Log Report for chart recovery (BILLING_UI_MAP URL_KNOWN → now used).
 */
async function extractPregnancyChartLinks(page, limit = 500) {
  return page.evaluate((maxItems) => {
    const re = /ShowDefaultClientScreen\/([0-9a-f-]{36})|\/Pregnancy\/Billing\/([0-9a-f-]{36})|[?&]pregnancyID=([0-9a-f-]{36})/i;
    const unique = [];
    const seen = new Set();
    for (const el of Array.from(document.querySelectorAll('a[href]'))) {
      const href = el.href || '';
      const m = href.match(re);
      if (!m) continue;
      const id = m[1] || m[2] || m[3];
      if (!id || seen.has(id.toLowerCase())) continue;
      seen.add(id.toLowerCase());
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      const rowText = (el.closest('tr')?.innerText || text).replace(/\s+/g, ' ').trim();
      const nameSource = text.split(/MRN#?:/i)[0].trim() || rowText.split(/MRN#?:/i)[0].trim();
      const mrnMatch = rowText.match(/MRN#?:?\s*([0-9]+)/i);
      unique.push({
        href,
        pregnancyId: id,
        rawText: rowText.slice(0, 220),
        name: nameSource.slice(0, 120) || id,
        mrn: mrnMatch ? mrnMatch[1] : null,
      });
      if (unique.length >= maxItems) break;
    }
    return unique;
  }, Math.max(1, Math.min(Number(limit) || 500, 800)));
}

async function clickDirectoryFilterHints(page) {
  return page.evaluate(() => {
    const want = /clear filter|view all|all clients|inactive|completed|discharged|closed|archiv|former|past/i;
    const clicked = [];
    const nodes = Array.from(document.querySelectorAll('a, button, span, div, label, li, option'));
    for (const el of nodes) {
      const text = (el.textContent || el.value || '').trim().replace(/\s+/g, ' ');
      if (!text || text.length > 60) continue;
      if (!want.test(text)) continue;
      if (el.tagName === 'OPTION') {
        const sel = el.parentElement;
        if (sel && sel.tagName === 'SELECT') {
          sel.value = el.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          clicked.push(text.slice(0, 60));
        }
        continue;
      }
      if (el.offsetParent === null && el.getClientRects().length === 0) continue;
      el.click();
      clicked.push(text.slice(0, 60));
      if (clicked.length >= 4) break;
    }
    return { clicked: clicked.length > 0, labels: clicked };
  });
}

async function extractBillingFieldPairs(page) {
  return page.evaluate(() => {
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const keyword = /billing|insurance|claim|payer|policy|subscriber|member|group|guarantor|copay|deduct|remit|era|balance|payment|auto debit|bill/i;
    const controls = Array.from(document.querySelectorAll('input, select, textarea')).filter(isVisible);
    const rows = [];

    for (const el of controls) {
      const id = el.id || '';
      const name = el.name || '';
      const type = (el.getAttribute('type') || '').toLowerCase();
      let value = '';
      if (el.tagName === 'SELECT') value = el.options?.[el.selectedIndex]?.text || '';
      else if (type === 'checkbox' || type === 'radio') value = el.checked ? 'checked' : 'unchecked';
      else value = el.value || '';

      const labelByFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const nearestLabel = el.closest('label');
      const containerText = el.closest('tr, .form-group, .field, td, li, div')?.innerText || '';
      const label = (labelByFor?.innerText || nearestLabel?.innerText || containerText || name || id || '').replace(/\s+/g, ' ').trim();
      const haystack = `${label} ${name} ${id} ${value}`.toLowerCase();
      if (!keyword.test(haystack)) continue;

      rows.push({
        label,
        name,
        id,
        value: String(value || '').trim(),
        fieldType: el.tagName === 'SELECT' ? 'select' : (type || el.tagName.toLowerCase()),
        options: el.tagName === 'SELECT'
          ? Array.from(el.options || [])
            .map((option) => ({
              value: String(option.value || '').trim(),
              text: String(option.textContent || '').replace(/\s+/g, ' ').trim(),
            }))
            .filter((option) => option.text)
          : [],
      });
    }

    const unique = [];
    const seen = new Set();
    for (const row of rows) {
      const key = `${row.label}|${row.name}|${row.id}|${row.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
      if (unique.length >= 60) break;
    }
    return unique;
  });
}

function buildAccountRepairPlan(account = {}, requestedUpdates = {}) {
  const billingFields = Array.isArray(account.billingFields) ? account.billingFields : [];
  const accountSummary = account.accountSummary || {};
  const diagnosis = account.diagnosis || {};
  const insurancePreview = Array.isArray(account.insurancePreview) ? account.insurancePreview : [];
  const selectedCoverageIndex = Number.isFinite(Number(requestedUpdates.insurance_slot)) ? Math.max(0, Math.floor(Number(requestedUpdates.insurance_slot))) : 0;
  const primaryCoverage = insurancePreview[selectedCoverageIndex] || insurancePreview[0] || {};

  const fieldByLabel = (pattern) => billingFields.find((field) => pattern.test(String(field.label || '')));
  const billingStatusField = fieldByLabel(/client billing status/i);
  const providerTypeField = fieldByLabel(/bill provider type/i);
  const insuranceNameField = fieldByLabel(/insurance name|carrier|payer name/i);
  const memberIdField = fieldByLabel(/member id|subscriber id|policy number/i);
  const subscriberField = fieldByLabel(/subscriber name/i);
  const payorIdField = fieldByLabel(/payor id|payer id/i);
  const priorityField = fieldByLabel(/insurance priority|priority/i);
  const relationshipField = fieldByLabel(/relationship to insured/i);
  const groupNumberField = fieldByLabel(/group\s*#|group number|^group$/i);

  const supported = [];
  const unsupported = [];
  const needed = [];

  if (requestedUpdates.client_billing_status) {
    supported.push({
      field: 'client_billing_status',
      label: 'Client Billing Status',
      current: accountSummary.clientBillingStatus || '',
      target: requestedUpdates.client_billing_status,
      options: billingStatusField?.options || [],
    });
  } else if (!accountSummary.clientBillingStatus) {
    needed.push({
      field: 'client_billing_status',
      label: 'Client Billing Status',
      current: accountSummary.clientBillingStatus || '',
      options: billingStatusField?.options || [],
      reason: 'Client billing status is blank.',
    });
  }

  if (requestedUpdates.bill_provider_type) {
    supported.push({
      field: 'bill_provider_type',
      label: 'Bill Provider Type',
      current: accountSummary.billProviderType || '',
      target: requestedUpdates.bill_provider_type,
      options: providerTypeField?.options || [],
    });
  } else if (!accountSummary.billProviderType) {
    needed.push({
      field: 'bill_provider_type',
      label: 'Bill Provider Type',
      current: accountSummary.billProviderType || '',
      options: providerTypeField?.options || [],
      reason: 'Bill provider type is blank.',
    });
  }

  if (requestedUpdates.payment_status) {
    supported.push({
      field: 'payment_status',
      label: 'Payment Status',
      current: accountSummary.paymentStatus || '',
      target: requestedUpdates.payment_status,
      options: ['yes', 'no'],
    });
  } else if (accountSummary.paymentStatus === 'no') {
    needed.push({
      field: 'payment_status',
      label: 'Payment Status',
      current: accountSummary.paymentStatus || '',
      options: ['yes', 'no'],
      reason: 'Payment status is still marked no / not started.',
    });
  }

  if (requestedUpdates.insurance_name) {
    supported.push({
      field: 'insurance_name',
      label: 'Insurance Name',
      current: primaryCoverage.insuranceName || '',
      target: requestedUpdates.insurance_name,
      options: insuranceNameField?.options || [],
    });
  } else if (!primaryCoverage.insuranceName) {
    needed.push({
      field: 'insurance_name',
      label: 'Insurance Name',
      current: '',
      options: insuranceNameField?.options || [],
      reason: 'Insurance name is blank or not visible.',
    });
  }

  if (requestedUpdates.member_id) {
    supported.push({
      field: 'member_id',
      label: 'Member ID',
      current: primaryCoverage.memberId || '',
      target: requestedUpdates.member_id,
      options: memberIdField?.options || [],
    });
  } else if (!primaryCoverage.memberId) {
    needed.push({
      field: 'member_id',
      label: 'Member ID',
      current: '',
      options: memberIdField?.options || [],
      reason: 'Member ID is blank or not visible.',
    });
  }

  if (requestedUpdates.subscriber_name) {
    supported.push({
      field: 'subscriber_name',
      label: 'Subscriber Name',
      current: primaryCoverage.subscriberName || '',
      target: requestedUpdates.subscriber_name,
      options: subscriberField?.options || [],
    });
  }

  if (requestedUpdates.payor_id) {
    supported.push({
      field: 'payor_id',
      label: 'Payor ID',
      current: primaryCoverage.payorId || '',
      target: requestedUpdates.payor_id,
      options: payorIdField?.options || [],
    });
  }

  if (requestedUpdates.relationship_to_insured) {
    supported.push({
      field: 'relationship_to_insured',
      label: 'Relationship to Insured',
      current: primaryCoverage.relationship || '',
      target: requestedUpdates.relationship_to_insured,
      options: relationshipField?.options || [],
    });
  }

  if (requestedUpdates.group_number) {
    supported.push({
      field: 'group_number',
      label: 'Group Number',
      current: primaryCoverage.groupNumber || '',
      target: requestedUpdates.group_number,
      options: groupNumberField?.options || [],
    });
  }

  if (requestedUpdates.insurance_priority) {
    supported.push({
      field: 'insurance_priority',
      label: 'Insurance Priority',
      current: primaryCoverage.priority || '',
      target: requestedUpdates.insurance_priority,
      options: priorityField?.options || [],
    });
  } else if (!primaryCoverage.priority && insurancePreview.length === 1) {
    needed.push({
      field: 'insurance_priority',
      label: 'Insurance Priority',
      current: '',
      options: priorityField?.options || [],
      reason: 'Insurance priority is blank.',
    });
  }

  if (!insurancePreview.length) {
    unsupported.push({
      field: 'insurance_details',
      label: 'Insurance details',
      reason: 'No insurer details are visible. Insurer/member entry still needs manual review or a payer-specific writeback path.',
    });
  }

  if (insurancePreview.length > 1 && requestedUpdates.insurance_priority && requestedUpdates.insurance_slot == null) {
    unsupported.push({
      field: 'insurance_priority_multi',
      label: 'Insurance priority',
      reason: 'Multiple coverages are visible. Choose a specific coverage slot before changing payer order or priority.',
    });
  }

  if (insurancePreview.length > 1 && requestedUpdates.insurance_slot == null) {
    unsupported.push({
      field: 'payer_order',
      label: 'Payer order',
      reason: 'Multiple coverages are visible. Select the exact visible coverage before automation changes payer details safely.',
    });
  }

  if (/client_match_issue/i.test(String(diagnosis.status || ''))) {
    unsupported.push({
      field: 'client_match',
      label: 'Client match',
      reason: 'Client matching issues still require manual identity verification before writeback.',
    });
  }

  return {
    supported,
    needed,
    unsupported,
  };
}

async function applyBillingFieldUpdates(page, updates = {}) {
  return page.evaluate((requestedUpdates) => {
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const controls = Array.from(document.querySelectorAll('input, select, textarea')).filter(visible);
    const describe = (el) => {
      const id = el.id || '';
      const labelByFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const nearestLabel = el.closest('label');
      const containerText = el.closest('tr, .form-group, .field, td, li, div')?.innerText || '';
      return (labelByFor?.innerText || nearestLabel?.innerText || containerText || el.name || el.id || '').replace(/\s+/g, ' ').trim();
    };
    const dispatch = (el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const findControls = (matcher) => controls.filter((el) => matcher.test(`${describe(el)} ${el.name || ''} ${el.id || ''}`));

    const scoreControl = (control, hint = '') => {
      if (!hint) return 0;
      const currentValue = control.tagName === 'SELECT'
        ? (control.options?.[control.selectedIndex]?.text || control.value || '')
        : (control.value || '');
      const haystack = normalize(`${describe(control)} ${currentValue}`);
      const normalizedHint = normalize(hint);
      if (!normalizedHint) return 0;
      if (haystack === normalizedHint) return 4;
      if (haystack.includes(normalizedHint)) return 3;
      if (normalizedHint.includes(haystack) && haystack) return 2;
      return 0;
    };

    const setControlValue = (matcher, desiredValue, kind, options = {}) => {
      const matches = findControls(matcher);
      const hint = options.matchHint || '';
      const sortedMatches = hint
        ? matches
          .map((control, index) => ({ control, index, score: scoreControl(control, hint) }))
          .sort((a, b) => (b.score - a.score) || (a.index - b.index))
        : matches.map((control, index) => ({ control, index, score: 0 }));
      const control = (sortedMatches.find((item) => item.score > 0) || sortedMatches[Math.max(0, Math.min(Number(options.matchIndex || 0), Math.max(sortedMatches.length - 1, 0)))])?.control;
      if (!control) {
        return { kind, applied: false, reason: 'Control not found', matchIndex: Number(options.matchIndex || 0) };
      }

      const normalizedDesired = normalize(desiredValue);
      if (control.tagName === 'SELECT') {
        const option = Array.from(control.options || []).find((item) => {
          return normalize(item.textContent) === normalizedDesired
            || normalize(item.value) === normalizedDesired
            || normalize(item.textContent).includes(normalizedDesired)
            || normalizedDesired.includes(normalize(item.textContent));
        });
        if (!option) {
          return {
            kind,
            applied: false,
            reason: 'Option not found',
            availableOptions: Array.from(control.options || []).map((item) => (item.textContent || '').trim()).filter(Boolean),
          };
        }
        control.value = option.value;
        dispatch(control);
        return { kind, applied: true, target: option.textContent || option.value || desiredValue };
      }

      const type = normalize(control.getAttribute('type'));
      if (type === 'radio' || type === 'checkbox') {
        const groupName = control.name || null;
        const group = groupName
          ? controls.filter((item) => (item.name || '') === groupName)
          : controls.filter((item) => matcher.test(`${describe(item)} ${item.name || ''} ${item.id || ''}`));
        const candidate = group.find((item) => {
          const haystack = `${describe(item)} ${item.name || ''} ${item.id || ''} ${item.value || ''}`;
          return normalize(haystack).includes(normalizedDesired)
            || (normalizedDesired === 'yes' && /yes|true|started/i.test(haystack))
            || (normalizedDesired === 'no' && /no|false|not started/i.test(haystack));
        });
        if (!candidate) {
          return { kind, applied: false, reason: 'Matching radio/checkbox option not found' };
        }
        candidate.checked = true;
        candidate.click?.();
        dispatch(candidate);
        return { kind, applied: true, target: desiredValue };
      }

      control.focus();
      control.value = desiredValue;
      dispatch(control);
      return { kind, applied: true, target: desiredValue };
    };

    const setSelectByIdOrMatcher = (ids, matcher, desiredValue, kind) => {
      const normalizedDesired = normalize(desiredValue);
      let control = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && visible(el)) {
          control = el;
          break;
        }
      }
      if (!control) {
        return setControlValue(matcher, desiredValue, kind);
      }
      if (control.tagName !== 'SELECT') {
        return setControlValue(matcher, desiredValue, kind);
      }
      const option = Array.from(control.options || []).find((item) => {
        return normalize(item.textContent) === normalizedDesired
          || normalize(item.value) === normalizedDesired
          || normalize(item.textContent).includes(normalizedDesired)
          || normalizedDesired.includes(normalize(item.textContent));
      });
      if (!option) {
        return {
          kind,
          applied: false,
          reason: 'Option not found',
          controlId: control.id || null,
          availableOptions: Array.from(control.options || []).map((item) => (item.textContent || '').trim()).filter(Boolean).slice(0, 40),
        };
      }
      Array.from(control.options || []).forEach((item) => {
        item.selected = item === option;
      });
      control.value = option.value;
      control.selectedIndex = Array.from(control.options || []).indexOf(option);
      dispatch(control);
      if (typeof window.jQuery === 'function') {
        try { window.jQuery(control).val(option.value).trigger('change'); } catch (_) { /* ignore */ }
      }
      const selectedText = control.options?.[control.selectedIndex]?.text || '';
      return {
        kind,
        applied: normalize(selectedText).includes(normalizedDesired) || normalize(control.value) === normalize(option.value),
        target: option.textContent || option.value || desiredValue,
        controlId: control.id || null,
        selectedText,
        selectedValue: control.value || null,
      };
    };

    const operations = [];
    if (requestedUpdates.client_billing_status) {
      operations.push(setSelectByIdOrMatcher(
        ['BillingStatusID', 'ClientBillingStatusID', 'billingStatusID'],
        /client billing status/i,
        requestedUpdates.client_billing_status,
        'client_billing_status'
      ));
    }
    if (requestedUpdates.bill_provider_type) {
      operations.push(setSelectByIdOrMatcher(
        ['BillUnderProvTypeID', 'BillProviderTypeID', 'ProviderTypeID'],
        /bill provider type/i,
        requestedUpdates.bill_provider_type,
        'bill_provider_type'
      ));
    }
    if (requestedUpdates.payment_status) {
      operations.push(setControlValue(/payment status|paymentstatus/i, requestedUpdates.payment_status, 'payment_status'));
    }
    if (requestedUpdates.insurance_name) {
      operations.push(setControlValue(/insurance name|carrier|payer name/i, requestedUpdates.insurance_name, 'insurance_name', { matchIndex: Number(requestedUpdates.insurance_slot || 0), matchHint: requestedUpdates.insurance_match_hints?.insurance_name || '' }));
    }
    if (requestedUpdates.member_id) {
      operations.push(setControlValue(/member id|subscriber id|policy number/i, requestedUpdates.member_id, 'member_id', { matchIndex: Number(requestedUpdates.insurance_slot || 0), matchHint: requestedUpdates.insurance_match_hints?.member_id || '' }));
    }
    if (requestedUpdates.subscriber_name) {
      operations.push(setControlValue(/subscriber name/i, requestedUpdates.subscriber_name, 'subscriber_name', { matchIndex: Number(requestedUpdates.insurance_slot || 0), matchHint: requestedUpdates.insurance_match_hints?.subscriber_name || '' }));
    }
    if (requestedUpdates.group_number) {
      operations.push(setControlValue(/group\s*#|group number|^group$/i, requestedUpdates.group_number, 'group_number', { matchIndex: Number(requestedUpdates.insurance_slot || 0), matchHint: requestedUpdates.insurance_match_hints?.group_number || '' }));
    }
    if (requestedUpdates.relationship_to_insured) {
      operations.push(setControlValue(/relationship to insured|relationship\s*to\s*the\s*insured|insured\s*relationship/i, requestedUpdates.relationship_to_insured, 'relationship_to_insured', { matchIndex: Number(requestedUpdates.insurance_slot || 0), matchHint: requestedUpdates.insurance_match_hints?.relationship || '' }));
    }
    if (requestedUpdates.payor_id) {
      operations.push(setControlValue(/payor id|payer id/i, requestedUpdates.payor_id, 'payor_id', { matchIndex: Number(requestedUpdates.insurance_slot || 0), matchHint: requestedUpdates.insurance_match_hints?.payor_id || '' }));
    }
    if (requestedUpdates.insurance_priority) {
      operations.push(setControlValue(/insurance priority|priority/i, requestedUpdates.insurance_priority, 'insurance_priority', { matchIndex: Number(requestedUpdates.insurance_slot || 0), matchHint: requestedUpdates.insurance_match_hints?.insurance_priority || '' }));
    }
    if (requestedUpdates.copay_amount) {
      operations.push(setControlValue(/\bcopay\b/i, requestedUpdates.copay_amount, 'copay'));
    }
    if (requestedUpdates.deductible_remaining_amount) {
      operations.push(setControlValue(/deductible/i, requestedUpdates.deductible_remaining_amount, 'deductible'));
    }

    return { operations };
  }, updates);
}

async function attemptBillingSave(page) {
  const clicked = await page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const anchor =
      document.getElementById('BillingStatusID') ||
      document.getElementById('BillUnderProvTypeID') ||
      document.querySelector('select[name="BillingStatusID"], select[name="BillUnderProvTypeID"]');
    const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'))
      .filter(visible)
      .map((el) => ({
        el,
        text: (el.textContent || el.value || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter((item) => /^save$/i.test(item.text) || /^(update|apply)$/i.test(item.text) || /^save\b/i.test(item.text));

    let target = null;
    if (anchor && candidates.length) {
      const aRect = anchor.getBoundingClientRect();
      let best = null;
      for (const item of candidates) {
        const r = item.el.getBoundingClientRect();
        const dist = Math.abs(r.top - aRect.top) + Math.abs(r.left - aRect.left);
        if (!best || dist < best.dist) best = { item, dist };
      }
      target = best?.item || null;
    }
    if (!target) {
      target = candidates.find((item) => /^save$/i.test(item.text)) || candidates[0] || null;
    }
    if (!target) {
      const fallback = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'))
        .filter(visible)
        .map((el) => ({ el, text: (el.textContent || el.value || '').replace(/\s+/g, ' ').trim() }))
        .find((item) => /save|update|apply|submit/i.test(item.text));
      if (!fallback) return null;
      target = fallback;
    }
    if (typeof target.el.click === 'function') target.el.click();
    return target.text || 'save';
  });
  if (!clicked) return { attempted: false, label: null };
  await sleep(2500);
  return { attempted: true, label: clicked };
}

/**
 * Post a billing note to ClientCare on the current billing page.
 * Strategy:
 *   1. Look for an "Add Note" / "New Note" / "Add Billing Note" button — click it to reveal the form.
 *   2. Find the first visible textarea (or text input labelled "note") and type the text.
 *   3. Click the closest "Save" / "Add" / "Submit" button that appears near the textarea.
 * Returns { ok, strategy, reason } — non-fatal if it fails; caller logs and continues.
 */
async function addBillingNote(page, noteText) {
  if (!noteText) return { ok: false, reason: 'no note text' };

  // Step 1 — try to click an "Add Note" reveal button
  const revealed = await page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const btn = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
      .filter(visible)
      .find((el) => /add\s*(billing\s*)?note|new\s*note|add\s*comment/i.test((el.textContent || el.value || '').trim()));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (revealed) await sleep(800);

  // Step 2 — find a visible textarea (or note-labelled text input)
  const typed = await page.evaluate((text) => {
    const visible = (el) => {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const contextText = (el) => {
      const id = el.id || '';
      const lbl = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const container = el.closest('tr, .form-group, .field, td, li, div');
      return (lbl?.textContent || container?.innerText || el.name || el.id || '').replace(/\s+/g, ' ').trim();
    };

    // Prefer textareas labelled "note" or "comment"
    const textareas = Array.from(document.querySelectorAll('textarea')).filter(visible);
    const noteArea = textareas.find((el) => /note|comment|message/i.test(contextText(el))) || textareas[0];
    if (noteArea) {
      noteArea.focus();
      noteArea.value = text;
      noteArea.dispatchEvent(new Event('input', { bubbles: true }));
      noteArea.dispatchEvent(new Event('change', { bubbles: true }));
      return { found: true, tag: 'textarea', context: contextText(noteArea) };
    }

    // Fallback: text input
    const inputs = Array.from(document.querySelectorAll('input[type="text"]')).filter(visible);
    const noteInput = inputs.find((el) => /note|comment|message/i.test(contextText(el)));
    if (noteInput) {
      noteInput.focus();
      noteInput.value = text;
      noteInput.dispatchEvent(new Event('input', { bubbles: true }));
      noteInput.dispatchEvent(new Event('change', { bubbles: true }));
      return { found: true, tag: 'input', context: contextText(noteInput) };
    }

    return { found: false };
  }, noteText);

  if (!typed.found) {
    return { ok: false, reason: 'no note textarea found on page', revealed };
  }

  await sleep(400);

  // Step 3 — click the save/submit button closest to where we typed
  const saved = await page.evaluate(() => {
    const visible = (el) => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const btn = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'))
      .filter(visible)
      .find((el) => /save|add|submit|post/i.test((el.textContent || el.value || '').trim()));
    if (btn) { btn.click(); return (btn.textContent || btn.value || 'save').trim(); }
    return null;
  });

  if (!saved) return { ok: false, reason: 'note typed but save button not found', typed };

  await sleep(1200);
  return { ok: true, strategy: revealed ? 'reveal_then_type' : 'direct_type', saved_via: saved, context: typed.context };
}

async function waitForBillingHome(page, timeoutMs = 10000) {
  await waitForCondition(async () => page.evaluate(() => {
    const text = document.body?.innerText || '';
    const hasLoading = /Loading Front Desk Notes|Loading Service Tickets|Loading Client Chats/i.test(text);
    const billingQueueLinks = document.querySelectorAll('a[href*="/Pregnancy/Billing/"]').length;
    return billingQueueLinks > 0 || !hasLoading;
  }), { timeoutMs, intervalMs: 750 });
}

async function extractBillingNotesFromPage(page) {
  return page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('table')).map((table) =>
      Array.from(table.querySelectorAll('tr')).map((row) =>
        Array.from(row.querySelectorAll('th,td')).map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
      )
    );

    const compactRows = (rows) => rows
      .map((row) => row.map((cell) => String(cell || '').trim()))
      .filter((row) => row.some(Boolean));

    const normalizeObjects = (rows) => {
      if (rows.length < 2) return [];
      const headers = rows[0];
      return rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header || `col_${index + 1}`] = row[index] || '';
        });
        return obj;
      });
    };

    const notesTable = compactRows(tables[0] || []);
    const followupTable = compactRows(tables[1] || []);

    return {
      billingNotes: normalizeObjects(notesTable).slice(0, 100),
      followUpReminders: normalizeObjects(followupTable).slice(0, 100),
    };
  });
}

async function extractBillingQueueItems(page) {
  return page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('table'));
    const noteTable = tables.find((table) => {
      const headerCells = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td')).map((cell) => (cell.textContent || '').trim().toLowerCase());
      return headerCells.includes('client') && headerCells.some((cell) => cell.includes('note'));
    });
    if (!noteTable) return [];

    const rows = Array.from(noteTable.querySelectorAll('tr')).slice(1);
    return rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim());
      const links = Array.from(row.querySelectorAll('a[href]')).map((el) => ({
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        href: el.href || '',
      }));
      const billingLink = links.find((link) => /\/Pregnancy\/Billing\//i.test(link.href));
      const noteLink = links.find((link) => /\/Pregnancy\/BillingClientNote\//i.test(link.href));
      return {
        date: cells[0] || '',
        client: cells[1] || '',
        notePreview: cells[2] || '',
        by: cells[3] || '',
        forUser: cells[4] || '',
        read: cells[5] || '',
        billingHref: billingLink?.href || '',
        noteHref: noteLink?.href || '',
      };
    }).filter((item) => item.client || item.notePreview || item.billingHref);
  });
}

async function clickBillingNotesNextPage(page) {
  return page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('table'));
    const noteTable = tables.find((table) => {
      const headerCells = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td')).map((cell) => (cell.textContent || '').trim().toLowerCase());
      return headerCells.includes('client') && headerCells.some((cell) => cell.includes('note'));
    });
    if (!noteTable) return { clicked: false, reason: 'note_table_not_found' };

    let container = noteTable.parentElement;
    while (container && container !== document.body) {
      const nextControl = container.querySelector(
        '[title*="next page" i], [aria-label*="next page" i], .k-pager-nav.k-pager-next, .paginate_button.next, a[onclick*="next"], button[onclick*="next"]'
      );
      if (nextControl) {
        const classes = nextControl.className || '';
        const disabled = nextControl.getAttribute('aria-disabled') === 'true'
          || /\bdisabled\b/i.test(classes)
          || /\bk-state-disabled\b/i.test(classes);
        if (disabled) return { clicked: false, reason: 'next_disabled' };
        nextControl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return { clicked: true };
      }
      container = container.parentElement;
    }

    const globalNext = Array.from(document.querySelectorAll('[title*="next page" i], [aria-label*="next page" i], .k-pager-nav.k-pager-next, .paginate_button.next'))
      .find((el) => {
        const classes = el.className || '';
        return !(/\bdisabled\b/i.test(classes) || /\bk-state-disabled\b/i.test(classes) || el.getAttribute('aria-disabled') === 'true');
      });
    if (!globalNext) return { clicked: false, reason: 'next_not_found' };
    globalNext.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return { clicked: true };
  });
}

async function extractAllBillingQueueItems(page, { maxPages = 8, pageTimeoutMs = 15000 } = {}) {
  const allItems = [];
  const seenRows = new Set();
  const seenPages = new Set();

  for (let pageIndex = 0; pageIndex < Math.max(1, Number(maxPages) || 8); pageIndex += 1) {
    await waitForBillingHome(page, Math.max(5000, Number(pageTimeoutMs) || 15000));
    const pageItems = await extractBillingQueueItems(page);
    const pageSignature = JSON.stringify(pageItems.map((item) => `${item.date}|${item.client}|${item.notePreview}|${item.billingHref}`));
    if (!pageItems.length || seenPages.has(pageSignature)) break;
    seenPages.add(pageSignature);

    for (const item of pageItems) {
      const key = `${item.date}|${item.client}|${item.notePreview}|${item.billingHref}|${item.noteHref}`;
      if (seenRows.has(key)) continue;
      seenRows.add(key);
      allItems.push(item);
    }

    const beforeFirstKey = pageItems[0] ? `${pageItems[0].date}|${pageItems[0].client}|${pageItems[0].notePreview}` : '';
    const next = await clickBillingNotesNextPage(page);
    if (!next.clicked) break;

    await waitForCondition(async () => {
      const freshItems = await extractBillingQueueItems(page);
      if (!freshItems.length) return false;
      const freshFirstKey = `${freshItems[0].date}|${freshItems[0].client}|${freshItems[0].notePreview}`;
      return freshFirstKey !== beforeFirstKey;
    }, { timeoutMs: Math.max(5000, Number(pageTimeoutMs) || 15000), intervalMs: 750 }).catch(() => {});
  }

  return allItems;
}

function normalizeBillingNoteRecord(record = {}) {
  const pregnancyId = record.PregnancyID || record.pregnancyID || record.PregnancyId || record.pregnancyId || '';
  const clientNoteId = record.ClientNoteID || record.clientNoteID || record.ClientNoteId || record.clientNoteId || '';
  return {
    date: record.ClientNoteDate ? String(record.ClientNoteDate).slice(0, 10) : '',
    client: record.ClientName || record.clientName || '',
    notePreview: String(record.NoteText || record.noteText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    by: record.ProviderName || record.CreatedByName || record.CreatedBy || '',
    forUser: record.NoteForName || record.NoteFor || '',
    read: String(record.IsRead ?? ''),
    billingHref: pregnancyId ? `https://clientcarewest.net/Pregnancy/Billing/${pregnancyId}` : '',
    noteHref: clientNoteId ? `https://clientcarewest.net/Pregnancy/BillingClientNote/${clientNoteId}` : '',
    raw: record,
  };
}

async function captureBillingNotesApiConfig(page, { pageTimeoutMs = 15000 } = {}) {
  const hits = [];
  const handler = async (response) => {
    try {
      const url = response.url();
      if (!/\/Home\/GetMidwifeNotesList\//i.test(url)) return;
      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        // ignore
      }
      hits.push({ url, payload });
    } catch (_) {
      // ignore
    }
  };

  page.on('response', handler);
  try {
    const billingHome = new URL('/Home/BillingPartial', page.url() || 'https://clientcarewest.net/').toString();
    const nav = await gotoWithBudget(page, billingHome, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
    if (!nav.ok) return null;
    await waitForBillingHome(page, Math.max(5000, Number(pageTimeoutMs) || 15000));
    await waitForCondition(async () => hits.length > 0, { timeoutMs: Math.max(5000, Number(pageTimeoutMs) || 15000), intervalMs: 500 });
    return hits[0] || null;
  } finally {
    page.off('response', handler);
  }
}

async function fetchBillingNotesViaApi(page, apiUrl, { maxPages = 12 } = {}) {
  if (!apiUrl) return [];
  const firstUrl = new URL(apiUrl);
  const firstPageNo = Number(firstUrl.searchParams.get('pageNo') || '1');
  const pageSize = Number(firstUrl.searchParams.get('PageSize') || firstUrl.searchParams.get('pageSize') || '15');

  const results = [];
  let totalPages = Math.max(1, firstPageNo);
  for (let pageNo = firstPageNo; pageNo <= Math.max(firstPageNo, maxPages); pageNo += 1) {
    const requestUrl = new URL(firstUrl.toString());
    requestUrl.searchParams.set('pageNo', String(pageNo));
    requestUrl.searchParams.set('PageSize', String(pageSize));
    const payload = await page.evaluate(async (href) => {
      const response = await fetch(href, { credentials: 'include' });
      return response.json();
    }, requestUrl.toString()).catch(() => null);
    if (!payload || payload.success === false) break;
    const records = Array.isArray(payload.RecordList) ? payload.RecordList : [];
    if (!records.length) break;
    results.push(...records);
    const candidateTotalPages = Number(records[0]?.TotalPages || payload.TotalPages || payload.totalPages || 0);
    if (candidateTotalPages > 0) totalPages = candidateTotalPages;
    if (pageNo >= totalPages) break;
  }
  return results.map(normalizeBillingNoteRecord);
}

async function extractBillingNotesDiagnostics(page) {
  return page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('table'));
    const noteTable = tables.find((table) => {
      const headerCells = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td')).map((cell) => (cell.textContent || '').trim().toLowerCase());
      return headerCells.includes('client') && headerCells.some((cell) => cell.includes('note'));
    });
    if (!noteTable) return { pagerControls: [], scripts: [], hiddenFields: [] };

    let container = noteTable.parentElement;
    while (container && container !== document.body) {
      const hasPager = container.querySelector('[title*="page" i], [aria-label*="page" i], .k-pager-wrap, .paginate_button');
      if (hasPager) break;
      container = container.parentElement;
    }
    const root = container || noteTable.parentElement || document.body;
    const pagerControls = Array.from(root.querySelectorAll('a,button,span,div'))
      .map((el) => ({
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        title: el.getAttribute('title') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        className: el.className || '',
        href: el.href || '',
        onclick: el.getAttribute('onclick') || '',
        dataPage: el.getAttribute('data-page') || '',
      }))
      .filter((item) => /page|«|»|←|→|\bnext\b|\bprev\b/i.test(`${item.text} ${item.title} ${item.ariaLabel} ${item.className} ${item.onclick}`))
      .slice(0, 50);

    const scripts = Array.from(document.querySelectorAll('script'))
      .map((script) => script.textContent || '')
      .filter((text) => /BillingClientNote|BillingPartial|kendo|pager|grid/i.test(text))
      .slice(0, 10)
      .map((text) => text.slice(0, 1200));

    const hiddenFields = Array.from(document.querySelectorAll('input[type="hidden"]'))
      .map((input) => ({
        name: input.name || '',
        id: input.id || '',
        value: input.value || '',
      }))
      .filter((item) => /billing|note|grid|page/i.test(`${item.name} ${item.id} ${item.value}`))
      .slice(0, 30);

    return { pagerControls, scripts, hiddenFields };
  });
}

function summarizeBillingAccount(billingFields = []) {
  const map = Object.fromEntries(
    billingFields.map((field) => [String(field.label || field.name || '').toLowerCase(), field.value || ''])
  );
  const paymentStatusYes = billingFields.find((field) => /paymentstatus_yes/i.test(field.id || ''))?.value === 'checked';
  const paymentStatusNo = billingFields.find((field) => /paymentstatus_no/i.test(field.id || ''))?.value === 'checked';
  const clientBillingStatus = billingFields.find((field) => /client billing status/i.test(field.label || ''))?.value || '';
  const providerType = billingFields.find((field) => /bill provider type/i.test(field.label || ''))?.value || '';

  const flags = [];
  if (paymentStatusNo) flags.push('payment_not_started');
  if (!clientBillingStatus) flags.push('billing_status_blank');
  if (!providerType) flags.push('bill_provider_type_blank');
  return {
    paymentStatus: paymentStatusYes ? 'yes' : paymentStatusNo ? 'no' : 'unknown',
    clientBillingStatus,
    billProviderType: providerType,
    flags,
    needsReview: flags.length > 0,
  };
}

function diagnoseBillingIssue(queueItem = {}, account = {}) {
  const preview = String(queueItem.notePreview || '').toLowerCase();
  const flags = Array.isArray(account.accountSummary?.flags) ? account.accountSummary.flags : [];
  const insurers = Array.isArray(account.insurancePreview) ? account.insurancePreview : [];

  const needed = [];
  const whatWentWrong = [];

  if (/can't find client/.test(preview)) {
    whatWentWrong.push('Client matching failed in the billing workflow.');
    needed.push('Match the billing note to the correct client record and verify identifiers.');
  }
  if (/address/.test(preview)) {
    whatWentWrong.push('Required demographic data is missing.');
    needed.push('Add or verify the client address before billing can progress.');
  }
  if (/effective date/.test(preview)) {
    whatWentWrong.push('Insurance effective-date verification or insurance setup is incomplete.');
    needed.push('Verify policy effective date and confirm the correct payer is attached.');
  }
  if (flags.includes('payment_not_started')) {
    needed.push('Change payment status from not started once billing work is actually underway.');
  }
  if (flags.includes('billing_status_blank')) {
    needed.push('Set the client billing status so the account can be tracked correctly.');
  }
  if (flags.includes('bill_provider_type_blank')) {
    needed.push('Set the billing provider type.');
  }
  if (!insurers.length) {
    whatWentWrong.push('No insurer details were visible on the billing page.');
    needed.push('Verify insurance is entered and the payer/member data is complete.');
  }

  let status = 'needs_review';
  if (!whatWentWrong.length && needed.length) status = 'configuration_incomplete';
  if (/can't find client/.test(preview)) status = 'client_match_issue';
  else if (/address/.test(preview)) status = 'missing_demographics';
  else if (/effective date/.test(preview)) status = 'insurance_setup_issue';
  else if (flags.length) status = 'billing_configuration_issue';

  return {
    status,
    whatWentWrong: whatWentWrong.length ? whatWentWrong : ['Needs manual billing review.'],
    needed: Array.from(new Set(needed)),
  };
}

function daysSince(dateText) {
  if (!dateText) return null;
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function inferRecoveryBand(account = {}) {
  const status = String(account.diagnosis?.status || '').toLowerCase();
  const ageDays = daysSince(account.oldestNoteDate || account.date);
  const hasInsurer = Array.isArray(account.accountSummary?.insurers) && account.accountSummary.insurers.length > 0;

  if (ageDays == null) {
    return { band: 'review', label: 'Needs review', rank: 3 };
  }

  if (ageDays <= 180) {
    return { band: 'strong', label: 'Strong chance', rank: 1 };
  }

  if (ageDays <= 365) {
    if (status === 'insurance_setup_issue' || status === 'billing_configuration_issue') {
      return { band: 'possible', label: 'Still possible', rank: 2 };
    }
    return { band: 'review', label: 'Needs review', rank: 3 };
  }

  if (ageDays <= 730) {
    if (hasInsurer && status !== 'client_match_issue') {
      return { band: 'slim', label: 'Slim chance', rank: 4 };
    }
    return { band: 'unlikely', label: 'Unlikely', rank: 5 };
  }

  return { band: 'unlikely', label: 'Unlikely', rank: 5 };
}

function buildActionQueueSummary(accounts = []) {
  const bucketMap = new Map();
  for (const account of accounts) {
    const actions = Array.isArray(account.diagnosis?.needed) ? account.diagnosis.needed : ['Manual review'];
    for (const action of actions) {
      const key = String(action || 'Manual review').trim();
      if (!bucketMap.has(key)) {
        bucketMap.set(key, { action: key, count: 0, clients: [] });
      }
      const bucket = bucketMap.get(key);
      bucket.count += 1;
      if (account.client && bucket.clients.length < 8) bucket.clients.push(account.client);
    }
  }
  return Array.from(bucketMap.values())
    .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action))
    .slice(0, 8);
}

function buildWorkflowPlaybooks(accounts = []) {
  const playbookDefs = [
    {
      id: 'verify-insurance',
      title: 'Verify insurance and effective date',
      matches: (account) => String(account.diagnosis?.status || '') === 'insurance_setup_issue',
      steps: [
        'Confirm the plan was active on the date of service.',
        'Confirm the correct payer is attached and member data is complete.',
        'If dual coverage exists, verify primary vs secondary order.',
        'Update the ClientCare billing page so billing can move forward.',
      ],
    },
    {
      id: 'complete-billing-setup',
      title: 'Complete missing billing setup fields',
      matches: (account) => {
        const flags = Array.isArray(account.accountSummary?.flags) ? account.accountSummary.flags : [];
        return flags.includes('billing_status_blank') || flags.includes('bill_provider_type_blank');
      },
      steps: [
        'Set Client Billing Status.',
        'Set Bill Provider Type.',
        'Confirm payment workflow is started once the account is ready.',
        'Recheck that the account leaves the billing-note queue.',
      ],
    },
    {
      id: 'fix-demographics',
      title: 'Fix missing demographics or address data',
      matches: (account) => String(account.diagnosis?.status || '') === 'missing_demographics',
      steps: [
        'Open the client record and fill in the missing demographic field.',
        'Reopen the billing page and confirm the payer can be billed.',
        'Advance the account out of the note queue.',
      ],
    },
    {
      id: 'resolve-client-match',
      title: 'Resolve client match issues',
      matches: (account) => String(account.diagnosis?.status || '') === 'client_match_issue',
      steps: [
        'Match the billing note to the correct client record.',
        'Verify identifiers before updating billing.',
        'Then complete payer and billing setup fields.',
      ],
    },
    {
      id: 'enter-insurer',
      title: 'Enter or repair insurer details',
      matches: (account) => !Array.isArray(account.accountSummary?.insurers) || account.accountSummary.insurers.length === 0,
      steps: [
        'Enter or verify insurer name, member ID, subscriber, and payor ID.',
        'Confirm insurance priority and payer order.',
        'Return to billing setup and continue claim preparation.',
      ],
    },
  ];

  return playbookDefs
    .map((playbook) => {
      const matchedAccounts = accounts.filter((account) => playbook.matches(account));
      return {
        id: playbook.id,
        title: playbook.title,
        count: matchedAccounts.length,
        steps: playbook.steps,
        accounts: matchedAccounts.slice(0, 15).map((account) => ({
          client: account.client,
          oldestNoteDate: account.oldestNoteDate || '',
          status: account.diagnosis?.status || 'needs_review',
          recoveryBand: account.recoveryBand?.label || 'Needs review',
          insurers: account.accountSummary?.insurers || [],
          nextAction: account.diagnosis?.needed?.[0] || 'Manual review',
        })),
      };
    })
    .filter((playbook) => playbook.count > 0)
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

function buildFullReportSummary(accounts = [], queueItems = []) {
  const diagnosisCounts = {};
  const recoveryBandCounts = {};
  let paymentNotStarted = 0;
  let billingStatusBlank = 0;
  let providerTypeBlank = 0;
  let missingInsurer = 0;

  for (const account of accounts) {
    const status = account.diagnosis?.status || 'needs_review';
    diagnosisCounts[status] = (diagnosisCounts[status] || 0) + 1;

    const recovery = account.recoveryBand?.band || 'review';
    recoveryBandCounts[recovery] = (recoveryBandCounts[recovery] || 0) + 1;

    const flags = Array.isArray(account.accountSummary?.flags) ? account.accountSummary.flags : [];
    if (flags.includes('payment_not_started')) paymentNotStarted += 1;
    if (flags.includes('billing_status_blank')) billingStatusBlank += 1;
    if (flags.includes('bill_provider_type_blank')) providerTypeBlank += 1;
    if (!Array.isArray(account.accountSummary?.insurers) || !account.accountSummary.insurers.length) missingInsurer += 1;
  }

  const oldestAccounts = [...accounts]
    .sort((a, b) => String(a.oldestNoteDate || '').localeCompare(String(b.oldestNoteDate || '')))
    .slice(0, 12)
    .map((account) => ({
      client: account.client,
      oldestNoteDate: account.oldestNoteDate || '',
      latestNoteDate: account.latestNoteDate || '',
      noteCount: account.noteCount || 0,
      insurers: account.accountSummary?.insurers || [],
      status: account.diagnosis?.status || 'needs_review',
      recoveryBand: account.recoveryBand?.label || 'Needs review',
      nextAction: account.diagnosis?.needed?.[0] || 'Manual review',
    }));

  return {
    generatedAt: new Date().toISOString(),
    totalQueueItems: queueItems.length,
    totalAccounts: accounts.length,
    diagnosisCounts,
    recoveryBandCounts,
    paymentNotStarted,
    billingStatusBlank,
    providerTypeBlank,
    missingInsurer,
    oldestAccounts,
    topActions: buildActionQueueSummary(accounts),
    workflowPlaybooks: buildWorkflowPlaybooks(accounts),
  };
}

function extractBillingQueueLinks(summary = {}, { offset = 0, limit = 10 } = {}) {
  const links = Array.isArray(summary.allLinks) ? summary.allLinks : [];
  const queue = [];
  const seen = new Set();
  for (const link of links) {
    const href = link?.href || '';
    if (!/\/Pregnancy\/Billing\//i.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    queue.push({
      href,
      label: (link.text || '').replace(/\s+/g, ' ').trim(),
    });
  }
  const start = Math.max(0, Number(offset) || 0);
  return queue.slice(start, start + Math.max(1, Math.min(Number(limit) || 10, 25)));
}

async function extractBillingQueueLinksFromPage(page, { offset = 0, limit = 10 } = {}) {
  const links = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('a[href*="/Pregnancy/Billing/"]')).map((el) => ({
      href: el.href || '',
      label: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    }));
    const unique = [];
    const seen = new Set();
    for (const row of rows) {
      if (!row.href || seen.has(row.href)) continue;
      seen.add(row.href);
      unique.push(row);
    }
    return unique;
  });
  const start = Math.max(0, Number(offset) || 0);
  return links.slice(start, start + Math.max(1, Math.min(Number(limit) || 10, 25)));
}

function extractInsurancePreview(summary = {}) {
  const tables = Array.isArray(summary.tables) ? summary.tables : [];
  const insuranceEntries = [];
  const insuranceTable = tables.find((table) =>
    Array.isArray(table) && table.some((row) => row.some((cell) => /insurance name:|payor id:|subscriber name:/i.test(String(cell || ''))))
  );

  if (!insuranceTable) return insuranceEntries;

  let current = null;
  for (const row of insuranceTable) {
    const cells = row.map((cell) => String(cell || '').trim()).filter(Boolean);
    if (!cells.length) continue;
    if (/^Insurance Name:$/i.test(cells[0]) && cells[1]) {
      if (current) insuranceEntries.push(current);
      current = { insuranceName: cells[1] };
      continue;
    }
    if (!current) continue;
    if (/^Mem ID\/Pol#:/i.test(cells[0]) && cells[1]) current.memberId = cells[1];
    else if (/^Group #:/i.test(cells[0]) && cells[1]) current.groupNumber = cells[1];
    else if (/^Insurance Priority:/i.test(cells[0]) && cells[1]) current.priority = cells[1];
    else if (/^Relationship to Insured:/i.test(cells[0]) && cells[1]) current.relationship = cells[1];
    else if (/^Subscriber Name:/i.test(cells[0]) && cells[1]) current.subscriberName = cells[1];
    else if (/^Payor ID:/i.test(cells[0]) && cells[1]) current.payorId = cells[1];
  }
  if (current) insuranceEntries.push(current);
  return insuranceEntries;
}

/** Parse ClientCare page / modal text after an eligibility or VOB action (best-effort; UI varies). */
function extractVobStructuredFieldsFromText(text = '') {
  const t = String(text || '').replace(/\r/g, '');
  const pick = (re) => {
    const m = t.match(re);
    return m ? String(m[1] || m[2] || '').replace(/,/g, '').trim() : '';
  };
  return {
    plan_name: pick(/plan\s*name[:\s]+([^\n]+)/i) || pick(/payer\s*name[:\s]+([^\n]+)/i),
    insurance_name: pick(/insurance\s*name[:\s]+([^\n]+)/i),
    member_id: pick(/member\s*(?:id|#|number)[:\s]+([A-Z0-9][A-Z0-9\- ]{4,})/i)
      || pick(/subscriber\s*(?:id|#)[:\s]+([A-Z0-9][A-Z0-9\- ]{4,})/i),
    group_number: pick(/group\s*#?[:\s]+([A-Z0-9][A-Z0-9\-]{2,})/i),
    copay: pick(/copay[^:\n$]*[:\s]+\$?\s*([\d.]+)/i),
    deductible_remaining: pick(/deductible[^:\n$]*(?:remaining|met)?[:\s]+\$?\s*([\d.]+)/i),
    coinsurance: pick(/coinsurance[:\s]+([\d.]+%?)/i),
    oop_remaining: pick(/out[\s-]*of[\s-]*pocket[^:\n$]*[:\s]+\$?\s*([\d.]+)/i),
    network_status: /\bout[\s-]*of[\s-]*network\b/i.test(t) ? 'out_of_network' : (/\bin[\s-]*network\b/i.test(t) ? 'in_network' : ''),
    raw_snippet: t.slice(0, 12000),
  };
}

/** Phases: tighter patterns first, then broader recovery (button moved / relabeled). */
const VOB_CLICK_PATTERN_STRINGS_PRIMARY = [
  '\\bverify\\s+(?:benefits|eligibility)\\b',
  '\\bbenefits?\\s+verification\\b',
  '\\beligibility\\s*(?:check|verification|inquiry)?\\b',
  '\\bcheck\\s+(?:coverage|eligibility)\\b',
  '\\bvob\\b',
  '\\brte\\b',
  '\\breal[\\s-]*time\\b.*\\belig',
  '\\bget\\s+(?:eligibility|benefits)\\b',
  '\\bview\\s+(?:eligibility|benefits|coverage)\\b',
];

const VOB_CLICK_PATTERN_STRINGS_RECOVERY = [
  '\\belig(?:ibility|ible)?\\b',
  '\\bbenefits?\\b',
  '\\bcoverage\\s*(?:details|verification)\\b',
  '\\bpayer\\s*(?:portal|lookup|response)\\b',
  '\\bavaility\\b',
  '\\bevicore\\b',
  '\\bauth(?:orization)?\\s*(?:required|status)\\b',
];

function escapeRegexChars(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Heuristic: did the page show something that looks like a VOB/eligibility response?
 */
function analyzeVobResponseReceived({
  beforeText = '',
  afterText = '',
  beforeInsurance = [],
  afterInsurance = [],
  vobExtraction = {},
} = {}) {
  const ext = vobExtraction || {};
  const hasParsed = Boolean(
    ext.copay || ext.deductible_remaining || ext.member_id || ext.plan_name || ext.insurance_name || ext.group_number || ext.coinsurance || ext.oop_remaining,
  );
  const benefitRe = /eligible|ineligible|copay|coinsurance|deductible|benefit|authorization|auth\s+required|active\s+coverage|plan\s+pays|patient\s+respons|accumulator|o\s*o\s*p|out[\s-]*of[\s-]*pocket|remaining\s+deduct/i;
  const beforeT = String(beforeText || '');
  const afterT = String(afterText || '');
  const lenDelta = afterT.length - beforeT.length;
  const keywordGain = benefitRe.test(afterT) && (!benefitRe.test(beforeT) || afterT.length > beforeT.length + 200);

  const flat = (arr) => JSON.stringify(arr || []);
  const insuranceChanged = flat(beforeInsurance) !== flat(afterInsurance);

  let received = hasParsed || insuranceChanged || (lenDelta > 350 && benefitRe.test(afterT)) || keywordGain;
  let reason = 'no_vob_signals';
  if (hasParsed) reason = 'parsed_financial_or_id_fields';
  else if (insuranceChanged) reason = 'insurance_block_changed';
  else if (lenDelta > 350 && benefitRe.test(afterT)) reason = 'large_text_increase_with_benefit_language';
  else if (keywordGain) reason = 'new_benefit_keywords_visible';

  const portalBlocked = /unable to (?:complete|verify|retrieve)|session (?:has expired|timed out)|please sign in|login required|authentication failed/i.test(afterT);
  if (portalBlocked && !hasParsed) {
    received = false;
    reason = 'portal_error_or_auth';
  } else if (!received && /error|unable to|failed|try again|session expired/i.test(afterT)) {
    reason = 'possible_error_or_session_state';
  }

  return {
    received,
    reason,
    hasParsed,
    lenDelta,
    insuranceChanged,
  };
}

async function listVobClickCandidates(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const nodes = Array.from(document.querySelectorAll('button, a[href], [role="button"], input[type="button"], input[type="submit"]')).filter(visible);
    return nodes
      .map((el) => {
        const t = `${el.textContent || ''} ${el.value || ''}`.replace(/\s+/g, ' ').trim();
        return { text: t.slice(0, 160), tag: el.tagName, id: el.id || '' };
      })
      .filter((item) => item.text && item.text.length < 200);
  });
}

async function clickFirstMatchingButton(page, patternStrings, { phase = 'unknown', excludeNegative = true } = {}) {
  return page.evaluate(
    ({ patterns, excludeNegative: excl, phaseLabel }) => {
      const visible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const regexes = patterns.map((s) => {
        try {
          return new RegExp(s, 'i');
        } catch {
          return null;
        }
      }).filter(Boolean);
      const neg = /\b(log\s*out|sign\s*out|delete\s+client|cancel\s+order)\b/i;
      const candidates = Array.from(document.querySelectorAll('button, a[href], [role="button"], input[type="button"], input[type="submit"]')).filter(visible);
      for (const el of candidates) {
        const t = `${el.textContent || ''} ${el.value || ''}`.replace(/\s+/g, ' ').trim();
        if (!t || t.length > 180) continue;
        if (excl && neg.test(t)) continue;
        if (regexes.some((re) => re.test(t))) {
          try {
            el.click();
            return { clicked: true, label: t, phase: phaseLabel };
          } catch (e) {
            return { clicked: false, error: e?.message || 'click failed', phase: phaseLabel };
          }
        }
      }
      return { clicked: false, label: null, phase: phaseLabel };
    },
    { patterns: patternStrings, excludeNegative, phaseLabel: phase },
  );
}

async function clickSecondaryModalConfirm(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const nodes = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]')).filter(visible);
    const run = nodes.find((el) => {
      const t = `${el.textContent || ''} ${el.value || ''}`;
      return /\b(run|submit|ok|check|continue|view\s+results|get\s+elig|confirm)\b/i.test(t) && t.length < 120;
    });
    if (run) {
      try {
        run.click();
        return { clicked: true, label: `${run.textContent || ''}`.trim() };
      } catch {
        return { clicked: false };
      }
    }
    return { clicked: false };
  });
}

/** Highest-scoring billing-ish control when patterns fail (button moved / renamed). */
async function clickBestScoredFallback(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const neg = /\b(log\s*out|sign\s*out|delete|cancel\s+order|remove)\b/i;
    const candidates = Array.from(document.querySelectorAll('button, a[href], [role="button"], input[type="button"], input[type="submit"]')).filter(visible);
    let best = null;
    let bestScore = -1;
    for (const el of candidates) {
      const t = `${el.textContent || ''} ${el.value || ''}`.replace(/\s+/g, ' ').trim();
      if (!t || t.length > 140 || neg.test(t)) continue;
      let score = 0;
      const low = t.toLowerCase();
      if (/elig|benefit|vob|coverage|payer|verify|check|auth|rte|plan|deduct|copay|claim/i.test(low)) score += 15;
      if (/insurance|insured|subscriber|member/i.test(low)) score += 8;
      if (t.length < 60) score += 2;
      if (score > bestScore) {
        bestScore = score;
        best = { el, t, score };
      }
    }
    if (best && best.score >= 12) {
      try {
        best.el.click();
        return { clicked: true, label: best.t, score: best.score, phase: 'scored_fallback' };
      } catch (e) {
        return { clicked: false, error: e?.message };
      }
    }
    return { clicked: false, phase: 'scored_fallback', bestCandidate: best?.t || null, bestScore: best?.score ?? null };
  });
}

function extractDashboardCounts(summary = {}) {
  const text = `${summary.textPreview || ''}`;
  const count = (pattern) => {
    const match = text.match(pattern);
    return match ? Number(match[1]) : 0;
  };
  return {
    newBillingNotes: count(/You have\s+(\d+)\s+New Billing Notes/i),
    newLabs: count(/You have\s+(\d+)\s+New Labs/i),
    newUltrasounds: count(/You have\s+(\d+)\s+New Ultrasounds/i),
  };
}

function derivePageState(summary = {}) {
  const text = `${summary.textPreview || ''}`.toLowerCase();
  return {
    noItems: /no items to display/.test(text),
    noRecords: /no record\(s\) added to workspace/.test(text),
    hasBillingNotes: /billing notes/i.test(summary.textPreview || ''),
    hasChargeSlip: /charge slip/i.test(summary.textPreview || ''),
    hasSentBills: /review sent bills/i.test(summary.textPreview || ''),
    hasRemittance: /remittance report/i.test(summary.textPreview || ''),
  };
}

export function createClientCareBrowserService({
  env = process.env,
  logger = console,
  syncService = null,
  resolveTenantCredentials = null,
} = {}) {
  function getReadiness() {
    const configured = [];
    const missing = [];
    for (const key of REQUIRED_BROWSER_SECRETS) {
      if (env[key]) configured.push(key);
      else missing.push(key);
    }
    const optionalConfigured = OPTIONAL_BROWSER_SECRETS.filter((key) => !!env[key]);
    return {
      mode: 'browser_fallback',
      ready: missing.length === 0,
      requiredSecrets: REQUIRED_BROWSER_SECRETS,
      optionalSecrets: OPTIONAL_BROWSER_SECRETS,
      configuredSecrets: configured,
      missingSecrets: missing,
      optionalConfigured,
      workflowTemplates: WORKFLOW_TEMPLATES,
      configuredBaseUrl: env.CLIENTCARE_BASE_URL ? redact(env.CLIENTCARE_BASE_URL) : null,
      configuredUsername: env.CLIENTCARE_USERNAME ? redact(env.CLIENTCARE_USERNAME) : null,
      multiTenantCredentials: typeof resolveTenantCredentials === 'function',
      notes: [
        'Do not store ClientCare credentials in code or docs.',
        'BirthBill tenants use encrypted clientcare_tenant_credentials; founder default may use Railway CLIENTCARE_*.',
        'Selectors and automation steps should be finalized only after a live walkthrough of the ClientCare billing screens.',
      ],
    };
  }

  async function getCredentials({ tenantId = null, override = null } = {}) {
    if (override?.baseUrl && override?.username && override?.password) {
      return {
        baseUrl: override.baseUrl,
        username: override.username,
        password: override.password,
        mfaMode: override.mfaMode || null,
        mfaSecret: override.mfaSecret || null,
        source: 'override',
      };
    }
    if (tenantId && typeof resolveTenantCredentials === 'function') {
      const tenantCreds = await resolveTenantCredentials(tenantId);
      if (tenantCreds?.baseUrl && tenantCreds?.username && tenantCreds?.password) {
        return {
          baseUrl: tenantCreds.baseUrl,
          username: tenantCreds.username,
          password: tenantCreds.password,
          mfaMode: tenantCreds.mfaMode || null,
          mfaSecret: tenantCreds.mfaSecret || null,
          source: 'tenant_vault',
          tenantId,
        };
      }
    }
    if (!env.CLIENTCARE_BASE_URL || !env.CLIENTCARE_USERNAME || !env.CLIENTCARE_PASSWORD) {
      throw new Error('ClientCare browser credentials are not fully configured');
    }
    return {
      baseUrl: env.CLIENTCARE_BASE_URL,
      username: env.CLIENTCARE_USERNAME,
      password: env.CLIENTCARE_PASSWORD,
      mfaMode: env.CLIENTCARE_MFA_MODE || null,
      mfaSecret: env.CLIENTCARE_MFA_SECRET || null,
      source: 'env',
    };
  }

  async function login({ dryRun = false, tenantId = null, credentials: override = null } = {}) {
    const credentials = await getCredentials({ tenantId, override });
    // Tip: puppeteer.launch can hang forever under Chromium contention; race it.
    let session;
    try {
      session = await Promise.race([
        createSession({ logger }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('createSession/launch timed out after 45000ms')), 45000);
        }),
      ]);
    } catch (err) {
      throw new Error(String(err?.message || err));
    }
    const screenshots = [];

    try {
      await session.navigate(credentials.baseUrl);
      const sp0 = await screenshotPath('clientcare-login-page');
      await safeScreenshot(session.page, sp0);
      screenshots.push(sp0);

      if (dryRun) {
        return { ok: true, dryRun: true, session, screenshots, url: session.currentUrl() };
      }

      const userSelector = await tryFill(session.page, USERNAME_SELECTORS, credentials.username);
      const passSelector = await tryFill(session.page, PASSWORD_SELECTORS, credentials.password);
      if (!userSelector || !passSelector) {
        const failShot = await screenshotPath('clientcare-login-fields-missing');
        await safeScreenshot(session.page, failShot);
        screenshots.push(failShot);
        throw new Error('Could not locate ClientCare login fields');
      }

      const submitSelector = await tryClick(session.page, SUBMIT_SELECTORS);
      if (!submitSelector) {
        await session.page.keyboard.press('Enter').catch(() => {});
      }

      // Tip: networkidle2 never settles on ClientCare (polling/websockets) and wedges CDP.
      await session.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await sleep(1500);
      await dismissSessionTakeover(session.page);

      const after = await collectPageSummary(session.page);
      const sp1 = await screenshotPath('clientcare-after-login');
      await safeScreenshot(session.page, sp1);
      screenshots.push(sp1);

      const stillOnLogin = /login|sign in/i.test(after.title) && await session.page.$(PASSWORD_SELECTORS[0]);
      if (stillOnLogin) {
        throw new Error('ClientCare login appears to have failed; still on login screen');
      }

      return {
        ok: true,
        session,
        screenshots,
        loginSelectors: { userSelector, passSelector, submitSelector },
        page: after,
      };
    } catch (error) {
      await session.close().catch(() => {});
      throw error;
    }
  }

  async function crawlSiteMap({
    scope = 'billing',
    maxPages = 35,
    includeScreenshots = false,
    pageTimeoutMs = 25000,
    seedHrefs = null,
    onProgress = null,
  } = {}) {
    const progress = (partial) => {
      try { onProgress?.(partial); } catch (_) { /* ignore */ }
    };
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    const pages = [];
    const queue = [];
    const seen = new Set();
    try {
      progress({ phase: 'site_map_login_ok' });
      const landing = result.page || await collectPageSummary(session.page);
      const origin = new URL(landing.url || session.currentUrl()).origin;
      const defaultSeeds = scope === 'all'
        ? [
          '/',
          '/Report',
          '/Pregnancy',
          '/Scheduler',
          '/PracticeManagement',
          '/Employee',
          '/Home/BillingPartial',
          '/Home/BirthActivityPartial',
          '/Home/NotesPartial',
          '/Home/LabsUSPartial',
          '/Provider/DeskNoteListView',
          '/Company/ChargeSlip',
        ]
        : [
          '/Report',
          '/Home/BillingPartial',
          '/Company/ChargeSlip',
          '/Billing/BillingListView',
          '/Billing/RecordRemittanceAdvice',
          '/Billing/SuperBillReport',
          '/Billing/AccountReceivableReportCommon',
          '/Billing/BillingAuditReport',
          '/Billing/ClaimTrackingSummaryReport',
          '/BillingProgressChecklist/BillingProgressReport',
          '/Billing/BillingFollowUp',
          '/Company/BillingManagementReport',
          '/Billing/AllowedAmountReport',
          '/Billing/CPTCodeByProviderReport',
          '/Billing/AutoDebitPlanReport',
          '/Billing/InvoiceHCFAEdit',
          '/Billing/InvoiceUB04Edit',
          '/Billing/InvoiceClientInvoiceEdit',
          '/Services/Edit',
        ];
      const seeds = Array.isArray(seedHrefs) && seedHrefs.length
        ? seedHrefs
        : defaultSeeds;
      const enqueue = (href, label = null) => {
        if (!href || typeof href !== 'string') return;
        let abs = href;
        try {
          abs = new URL(href, origin).href;
        } catch (_) {
          return;
        }
        if (!abs.startsWith(origin)) return;
        if (/LogOff|javascript:|mailto:|#off-users/i.test(abs)) return;
        const key = abs.split('#')[0].replace(/\/$/, '') || abs;
        if (seen.has(key)) return;
        if (scope === 'billing') {
          const path = key.slice(origin.length);
          if (!/\/(Billing|BillingProgress|Report|Services|Company\/(ChargeSlip|Billing|Fax|CABC)|Home\/(Billing|Birth|Notes)|Pregnancy\/Billing)/i.test(path)
            && !/^\/Report/i.test(path)
            && path !== ''
            && path !== '/') {
            // allow Report hub and billing-ish only
            if (!/billing|claim|invoice|hcfa|ub04|remit|era|charge|super.?bill|receivable|aging|audit|debit|allowed|cpt|payment|follow.?up|progress/i.test(`${label || ''} ${path}`)) {
              return;
            }
          }
        }
        seen.add(key);
        queue.push({ href: key, label });
      };

      for (const s of seeds) enqueue(s.startsWith('http') ? s : `${origin}${s.startsWith('/') ? s : `/${s}`}`);
      for (const L of landing.allLinks || landing.candidateLinks || []) {
        enqueue(L.href, L.text);
      }

      const limit = Math.max(1, Math.min(Number(maxPages) || 35, 80));
      while (queue.length && pages.length < limit) {
        const item = queue.shift();
        progress({
          phase: 'site_map_page',
          index: pages.length + 1,
          limit,
          href: item.href,
          queued: queue.length,
        });
        const nav = await gotoWithBudget(session.page, item.href, {
          timeout: Math.max(8000, Number(pageTimeoutMs) || 25000),
        });
        if (!nav.ok) {
          pages.push({
            ok: false,
            seedLabel: item.label || null,
            href: item.href,
            error: nav.error || 'nav_failed',
          });
          continue;
        }
        await sleep(700);
        let summary = null;
        try {
          summary = await collectPageSummary(session.page);
        } catch (err) {
          pages.push({
            ok: false,
            seedLabel: item.label || null,
            href: item.href,
            error: String(err?.message || err).slice(0, 160),
          });
          continue;
        }
        let shot = null;
        if (includeScreenshots) {
          shot = await screenshotPath(`site-map-${pages.length + 1}`);
          await safeScreenshot(session.page, shot);
          screenshots.push(shot);
        }
        pages.push({
          ok: true,
          seedLabel: item.label || null,
          screenshot: shot,
          buttonCount: (summary.buttons || []).length,
          inputCount: (summary.inputs || []).length,
          selectCount: (summary.selects || []).length,
          ...summary,
        });
        for (const L of summary.allLinks || []) {
          enqueue(L.href, L.text);
        }
        for (const L of summary.candidateLinks || []) {
          enqueue(L.href, L.text);
        }
      }

      return {
        ok: true,
        scope,
        maxPages: limit,
        pageCount: pages.length,
        queuedRemaining: queue.length,
        pages,
        screenshots,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function discoverBillingSurface({ maxCandidates = 2, includeScreenshots = false, pageTimeoutMs = 20000 } = {}) {
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const landing = result.page || await collectPageSummary(session.page);
      const origin = new URL(landing.url || session.currentUrl()).origin;
      const visited = [];
      const candidateLimit = Math.max(1, Math.min(Number(maxCandidates) || 2, 4));
      const candidates = (landing.candidateLinks || [])
        .filter((item) => item.href && item.href.startsWith(origin))
        .slice(0, candidateLimit);
      for (const item of candidates) {
        try {
          const nav = await gotoWithBudget(session.page, item.href, { timeout: Math.max(5000, Number(pageTimeoutMs) || 20000) });
          if (!nav.ok) {
            visited.push({
              label: item.text || item.href,
              url: item.href,
              title: null,
              headings: [],
              candidateLinks: [],
              tables: [],
              textPreview: '',
              error: nav.error,
            });
            continue;
          }
          const summary = await collectPageSummary(session.page);
          let shot = null;
          if (includeScreenshots) {
            shot = await screenshotPath(`clientcare-discovery-${visited.length + 1}`);
            await safeScreenshot(session.page, shot);
            screenshots.push(shot);
          }
          visited.push({ label: item.text || item.href, screenshot: shot, ...summary });
        } catch (error) {
          logger.warn?.({ err: error.message, href: item.href }, '[CLIENTCARE-BROWSER] discovery candidate failed');
          visited.push({
            label: item.text || item.href,
            url: item.href,
            title: null,
            headings: [],
            candidateLinks: [],
            tables: [],
            textPreview: '',
            error: error.message,
          });
        }
      }
      return {
        ok: true,
        landing,
        visited,
        screenshots,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function inspectPage({ href, includeScreenshots = false, pageTimeoutMs = 15000 } = {}) {
    if (!href) throw new Error('href required');
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const landing = result.page || await collectPageSummary(session.page);
      const origin = new URL(landing.url || session.currentUrl()).origin;
      const target = href.startsWith('http') ? href : new URL(href, `${origin}/`).toString();
      const nav = await gotoWithBudget(session.page, target, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
      if (!nav.ok) {
        return {
          ok: false,
          href: target,
          error: nav.error,
          screenshots,
        };
      }
      const summary = await collectPageSummary(session.page);
      let shot = null;
      if (includeScreenshots) {
        shot = await screenshotPath('clientcare-inspect-page');
        await safeScreenshot(session.page, shot);
        screenshots.push(shot);
      }
      return {
        ok: true,
        page: summary,
        state: derivePageState(summary),
        screenshots,
        screenshot: shot,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function inspectClientBillingAccount({ clientHref, pageTimeoutMs = 15000, includeScreenshots = false } = {}) {
    if (!clientHref) throw new Error('clientHref required');
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const nav = await gotoWithBudget(session.page, clientHref, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
      if (!nav.ok) {
        return { ok: false, clientHref, error: nav.error, screenshots };
      }

      const billingTab = await session.page.$('a[href*="#tabs-billing"]');
      if (billingTab) {
        await billingTab.click().catch(() => {});
        await sleep(1200);
      }

      const summary = await collectPageSummary(session.page);
      const billingFields = await extractBillingFieldPairs(session.page);
      const insurancePreview = extractInsurancePreview(summary);
      let billingNotesPreview = [];
      try {
        const noteData = await extractBillingNotesFromPage(session.page);
        billingNotesPreview = Array.isArray(noteData?.billingNotes) ? noteData.billingNotes.slice(0, 25) : [];
      } catch {
        billingNotesPreview = [];
      }
      let shot = null;
      if (includeScreenshots) {
        shot = await screenshotPath('clientcare-client-billing');
        await safeScreenshot(session.page, shot);
        screenshots.push(shot);
      }

      return {
        ok: true,
        clientHref,
        page: summary,
        billingFields,
        insurancePreview,
        billingNotesPreview,
        repairPlan: buildAccountRepairPlan({
          clientHref,
          billingFields,
          insurancePreview,
          accountSummary: {
            ...summarizeBillingAccount(billingFields),
            insuranceCount: insurancePreview.length,
            insurers: insurancePreview.map((item) => item.insuranceName).filter(Boolean),
          },
          diagnosis: diagnoseBillingIssue({ notePreview: '' }, {
            billingFields,
            insurancePreview,
            accountSummary: {
              ...summarizeBillingAccount(billingFields),
              insuranceCount: insurancePreview.length,
              insurers: insurancePreview.map((item) => item.insuranceName).filter(Boolean),
            },
          }),
        }),
        accountSummary: {
          ...summarizeBillingAccount(billingFields),
          insuranceCount: insurancePreview.length,
          insurers: insurancePreview.map((item) => item.insuranceName).filter(Boolean),
        },
        state: {
          hasBillingTab: Boolean(billingTab),
          billingFieldCount: billingFields.length,
        },
        screenshots,
        screenshot: shot,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function repairBillingAccount({ billingHref, account = null, updates = {}, dryRun = true, pageTimeoutMs = 15000, includeScreenshots = false } = {}) {
    if (!billingHref) throw new Error('billingHref required');
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const nav = await gotoWithBudget(session.page, billingHref, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
      if (!nav.ok) return { ok: false, billingHref, error: nav.error, screenshots };

      const billingTab = await session.page.$('a[href*="#tabs-billing"]');
      if (billingTab) {
        await billingTab.click().catch(() => {});
        await sleep(1000);
      }

      const beforeSummary = await collectPageSummary(session.page);
      const beforeFields = await extractBillingFieldPairs(session.page);
      const beforeInsurancePreview = extractInsurancePreview(beforeSummary);
      const beforeAccount = {
        ...(account || {}),
        billingHref,
        billingFields: beforeFields,
        insurancePreview: beforeInsurancePreview,
        accountSummary: {
          ...summarizeBillingAccount(beforeFields),
          insuranceCount: beforeInsurancePreview.length,
          insurers: beforeInsurancePreview.map((item) => item.insuranceName).filter(Boolean),
        },
      };
      const repairPlan = buildAccountRepairPlan(beforeAccount, updates);

      let operations = [];
      let saveResult = { attempted: false, label: null };
      if (!dryRun) {
        const applyResult = await applyBillingFieldUpdates(session.page, updates);
        operations = applyResult.operations || [];

        // Prefer Puppeteer native select on known IDs — ClientCare selects often ignore in-page value assignment.
        const nativeOps = [];
        const statusTarget = String(updates.client_billing_status || '').trim();
        const providerTarget = String(updates.bill_provider_type || '').trim();
        if (statusTarget) {
          const statusField = beforeFields.find((f) => /client billing status/i.test(f.label || '') || f.id === 'BillingStatusID');
          const option = (statusField?.options || []).find((o) => {
            const text = String(o.text || '').toLowerCase();
            const want = statusTarget.toLowerCase();
            return text === want || text.includes(want) || want.includes(text);
          });
          if (option?.value) {
            try {
              await session.page.$eval('#BillingStatusID', (el, value) => {
                el.disabled = false;
                el.value = value;
                Array.from(el.options || []).forEach((item) => {
                  item.selected = item.value === value;
                });
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                if (typeof window.jQuery === 'function') {
                  try { window.jQuery(el).val(value).trigger('change'); } catch (_) { /* ignore */ }
                }
                try {
                  const widget = window.$?.(el)?.data?.('kendoDropDownList');
                  if (widget) widget.value(value);
                } catch (_) { /* ignore */ }
              }, option.value);
              const selected = await session.page.$eval('#BillingStatusID', (el) => ({
                value: el.value || null,
                text: el.options?.[el.selectedIndex]?.text || '',
              }));
              nativeOps.push({
                kind: 'client_billing_status_native',
                applied: Boolean(selected.value),
                target: statusTarget,
                forced: true,
                ...selected,
              });
            } catch (err) {
              nativeOps.push({ kind: 'client_billing_status_native', applied: false, error: err.message });
            }
          }
        }
        if (providerTarget) {
          const providerField = beforeFields.find((f) => /bill provider type/i.test(f.label || '') || f.id === 'BillUnderProvTypeID');
          const option = (providerField?.options || []).find((o) => {
            const text = String(o.text || '').toLowerCase();
            const want = providerTarget.toLowerCase();
            return text === want || text.includes(want) || want.includes(text);
          });
          if (option?.value) {
            try {
              await session.page.$eval('#BillUnderProvTypeID', (el, value) => {
                el.disabled = false;
                el.value = value;
                Array.from(el.options || []).forEach((item) => {
                  item.selected = item.value === value;
                });
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                if (typeof window.jQuery === 'function') {
                  try { window.jQuery(el).val(value).trigger('change'); } catch (_) { /* ignore */ }
                }
                try {
                  const widget = window.$?.(el)?.data?.('kendoDropDownList');
                  if (widget) widget.value(value);
                } catch (_) { /* ignore */ }
              }, option.value);
              const selected = await session.page.$eval('#BillUnderProvTypeID', (el) => ({
                value: el.value || null,
                text: el.options?.[el.selectedIndex]?.text || '',
              }));
              nativeOps.push({
                kind: 'bill_provider_type_native',
                applied: Boolean(selected.value),
                target: providerTarget,
                forced: true,
                ...selected,
              });
            } catch (err) {
              nativeOps.push({ kind: 'bill_provider_type_native', applied: false, error: err.message });
            }
          }
        }
        if (nativeOps.length) operations = [...operations, ...nativeOps];

        saveResult = await attemptBillingSave(session.page);
        // ClientCare often posts/reloads; re-open billing so after-summary reflects persisted values.
        await sleep(2000);
        const reload = await gotoWithBudget(session.page, billingHref, {
          timeout: Math.max(5000, Number(pageTimeoutMs) || 15000),
        });
        if (reload.ok) {
          const tab = await session.page.$('a[href*="#tabs-billing"]');
          if (tab) {
            await tab.click().catch(() => {});
            await sleep(1000);
          }
          saveResult = { ...saveResult, reloaded: true };
        } else {
          saveResult = { ...saveResult, reloaded: false, reloadError: reload.error };
        }
      }

      const afterSummary = dryRun ? beforeSummary : await collectPageSummary(session.page);
      const afterFields = dryRun ? beforeFields : await extractBillingFieldPairs(session.page);
      const afterInsurancePreview = dryRun ? beforeInsurancePreview : extractInsurancePreview(afterSummary);

      let shot = null;
      if (includeScreenshots) {
        shot = await screenshotPath(dryRun ? 'clientcare-repair-preview' : 'clientcare-repair-applied');
        await safeScreenshot(session.page, shot);
        screenshots.push(shot);
      }

      return {
        ok: true,
        billingHref,
        dryRun,
        repairPlan,
        before: {
          accountSummary: beforeAccount.accountSummary,
          billingFields: beforeFields,
          insurancePreview: beforeInsurancePreview,
        },
        after: {
          accountSummary: {
            ...summarizeBillingAccount(afterFields),
            insuranceCount: afterInsurancePreview.length,
            insurers: afterInsurancePreview.map((item) => item.insuranceName).filter(Boolean),
          },
          billingFields: afterFields,
          insurancePreview: afterInsurancePreview,
        },
        operations,
        saveResult,
        screenshots,
        screenshot: shot,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  /**
   * Runs ClientCare VOB/eligibility with retries: primary patterns → recovery patterns → scored fallback.
   * Detects whether a response arrived; logs steps for operators when UI changes.
   */
  function resolveVobInnerAttempts(requested) {
    if (Number.isFinite(Number(requested)) && Number(requested) >= 1) {
      return Math.min(12, Math.max(1, Math.floor(Number(requested))));
    }
    const fromEnv = Number(env.CLIENTCARE_VOB_INNER_ATTEMPTS);
    if (Number.isFinite(fromEnv) && fromEnv >= 1) {
      return Math.min(12, Math.max(2, Math.floor(fromEnv)));
    }
    return 5;
  }

  async function runClientcareVobFlow({ clientHref, pageTimeoutMs = 38000, maxAttempts: maxAttemptsArg } = {}) {
    if (!clientHref) throw new Error('clientHref required');
    const maxAttempts = resolveVobInnerAttempts(maxAttemptsArg);
    const hint = String(env.CLIENTCARE_VOB_BUTTON_HINT || '').trim();
    const primaryPatterns = [
      ...(hint ? [`.*${escapeRegexChars(hint)}.*`] : []),
      ...VOB_CLICK_PATTERN_STRINGS_PRIMARY,
    ];

    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    const steps = [];
    try {
      const nav = await gotoWithBudget(session.page, clientHref, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
      if (!nav.ok) {
        return { ok: false, clientHref, error: nav.error, screenshots };
      }

      const billingTab = await session.page.$('a[href*="#tabs-billing"]');
      if (billingTab) {
        await billingTab.click().catch(() => {});
        await sleep(1200);
      }

      const beforeSummary = await collectPageSummary(session.page);
      const beforeInsurance = extractInsurancePreview(beforeSummary);
      const beforeText = beforeSummary.textPreview || '';

      let lastSummary = beforeSummary;
      let lastInsurance = beforeInsurance;
      let lastClick = { clicked: false };
      let vobReceived = false;
      let analysis = { received: false, reason: 'not_attempted' };
      let currentPhase = 'primary';

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let patterns = primaryPatterns;
        let attemptPhase = 'primary';
        if (attempt === 1) {
          patterns = [...VOB_CLICK_PATTERN_STRINGS_RECOVERY];
          attemptPhase = 'recovery_broad';
        } else if (attempt === 2) {
          attemptPhase = 'scored_fallback';
        }
        currentPhase = attemptPhase;

        if (attempt < 2) {
          lastClick = await clickFirstMatchingButton(session.page, patterns, { phase: attemptPhase });
        } else {
          lastClick = await clickBestScoredFallback(session.page);
        }

        steps.push({
          attempt: attempt + 1,
          phase: attemptPhase,
          click: lastClick,
        });

        if (lastClick?.clicked) {
          await sleep(4500);
          const confirm = await clickSecondaryModalConfirm(session.page);
          if (confirm?.clicked) {
            steps[steps.length - 1].modal_confirm = confirm;
            await sleep(3500);
          } else {
            await sleep(2000);
          }
        }

        lastSummary = await collectPageSummary(session.page);
        lastInsurance = extractInsurancePreview(lastSummary);
        const bodyText = `${lastSummary.textPreview || ''}`;
        const vobExtraction = extractVobStructuredFieldsFromText(bodyText);
        analysis = analyzeVobResponseReceived({
          beforeText,
          afterText: bodyText,
          beforeInsurance,
          afterInsurance: lastInsurance,
          vobExtraction,
        });

        vobReceived = Boolean(analysis.received);
        if (vobReceived) {
          logger?.info?.(
            { clientHref, phase: currentPhase, reason: analysis.reason }, '[CLIENTCARE-BROWSER] VOB response detected',
          );
          break;
        }

        logger?.warn?.(
          {
            clientHref,
            attempt: attempt + 1,
            phase: attemptPhase,
            clicked: lastClick?.clicked,
            analysis,
          },
          '[CLIENTCARE-BROWSER] VOB response not detected — retrying',
        );

        if (attempt < maxAttempts - 1) {
          await sleep(1200);
        }
      }

      const buttonCatalog = await listVobClickCandidates(session.page);
      const finalText = `${lastSummary.textPreview || ''}`;
      const vobExtractionFinal = extractVobStructuredFieldsFromText(finalText);

      if (!vobReceived) {
        logger?.warn?.(
          {
            clientHref,
            hint: hint || '(set CLIENTCARE_VOB_BUTTON_HINT to match your portal label)',
            steps,
            analysis,
            sample_buttons: (buttonCatalog || []).slice(0, 25),
          },
          '[CLIENTCARE-BROWSER] VOB response still not detected after recovery — check button labels or portal state',
        );
      }

      return {
        ok: true,
        clientHref,
        vob_received: vobReceived,
        vob_analysis: analysis,
        recovery_steps: steps,
        vob_button: lastClick,
        beforeInsurance,
        afterInsurance: lastInsurance,
        vob_extraction: vobExtractionFinal,
        page_text_sample: finalText.slice(0, 15000),
        button_catalog_sample: (buttonCatalog || []).slice(0, 40),
        env_hint_configured: Boolean(hint),
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function scanClientBillingAccounts({ limit = 10, offset = 0, pageTimeoutMs = 15000 } = {}) {
    const result = await login({ dryRun: false });
    const { session } = result;
    try {
      const billingHomeUrl = new URL('/Home/BillingPartial', session.currentUrl()).toString();
      const billingHomeNav = await gotoWithBudget(session.page, billingHomeUrl, {
        timeout: Math.max(5000, Number(pageTimeoutMs) || 15000),
      });
      if (!billingHomeNav.ok) {
        return { ok: false, error: billingHomeNav.error, accounts: [] };
      }
      await waitForBillingHome(session.page, Math.max(5000, Number(pageTimeoutMs) || 15000));
      const billingHomeSummary = await collectPageSummary(session.page);
      let clients = (await extractBillingQueueLinksFromPage(session.page, { offset, limit })).map((item) => ({
        href: item.href,
        rawText: item.label,
        name: item.label || item.href,
        mrn: null,
        source: 'billing_queue',
      }));

      if (!clients.length) {
        clients = extractBillingQueueLinks(billingHomeSummary, { offset, limit }).map((item) => ({
          href: item.href,
          rawText: item.label,
          name: item.label || item.href,
          mrn: null,
          source: 'billing_queue_summary',
        }));
      }

      if (!clients.length) {
        const directoryNav = await gotoWithBudget(session.page, new URL('/Pregnancy?donotRedirect=Y', session.currentUrl()).toString(), {
          timeout: Math.max(5000, Number(pageTimeoutMs) || 15000),
        });
        if (!directoryNav.ok) {
          return { ok: false, error: directoryNav.error, accounts: [] };
        }
        const directory = await extractClientDirectory(session.page, Math.max((Number(offset) || 0) + (Number(limit) || 10), 10));
        clients = directory.slice(Math.max(0, Number(offset) || 0), Math.max(0, Number(offset) || 0) + Math.max(1, Math.min(Number(limit) || 10, 25))).map((item) => ({
          ...item,
          source: 'client_directory',
        }));
      }

      const accounts = [];
      for (const client of clients) {
        const nav = await gotoWithBudget(session.page, client.href, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
        if (!nav.ok) {
          accounts.push({ ...client, ok: false, error: nav.error });
          continue;
        }

        const billingTab = await session.page.$('a[href*="#tabs-billing"]');
        if (billingTab) {
          await billingTab.click().catch(() => {});
          await sleep(1200);
        }

        const pageSummary = await collectPageSummary(session.page);
        const billingFields = await extractBillingFieldPairs(session.page);
        const insurancePreview = extractInsurancePreview(pageSummary);
        const accountSummary = {
          ...summarizeBillingAccount(billingFields),
          insuranceCount: insurancePreview.length,
          insurers: insurancePreview.map((item) => item.insuranceName).filter(Boolean),
        };
        accounts.push({
          ...client,
          ok: true,
          currentUrl: pageSummary.url,
          billingFieldCount: billingFields.length,
          billingFields,
          insurancePreview,
          accountSummary,
          preview: (pageSummary.textPreview || '').slice(0, 700),
        });
      }

      return {
        ok: true,
        totalScanned: accounts.length,
        offset: Math.max(0, Number(offset) || 0),
        accounts,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function scanBillingNotes({ pageTimeoutMs = 15000 } = {}) {
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const billingHome = new URL('/Home/BillingPartial', session.currentUrl()).toString();
      const nav = await gotoWithBudget(session.page, billingHome, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
      if (!nav.ok) {
        return { ok: false, error: nav.error, screenshots };
      }
      await waitForBillingHome(session.page, Math.max(5000, Number(pageTimeoutMs) || 15000));
      const summary = await collectPageSummary(session.page);
      const notes = await extractBillingNotesFromPage(session.page);
      return {
        ok: true,
        dashboardCounts: extractDashboardCounts(summary),
        page: summary,
        notes,
        state: derivePageState(summary),
        screenshots,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function buildAccountRescueReport({ limit = 15, offset = 0, pageTimeoutMs = 15000 } = {}) {
    const result = await login({ dryRun: false });
    const { session } = result;
    try {
      const billingHome = new URL('/Home/BillingPartial', session.currentUrl()).toString();
      const nav = await gotoWithBudget(session.page, billingHome, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
      if (!nav.ok) return { ok: false, error: nav.error };
      await waitForBillingHome(session.page, Math.max(5000, Number(pageTimeoutMs) || 15000));
      const summary = await collectPageSummary(session.page);
      const queueItems = await extractBillingQueueItems(session.page);
      const selected = queueItems.slice(Math.max(0, Number(offset) || 0), Math.max(0, Number(offset) || 0) + Math.max(1, Math.min(Number(limit) || 15, 25)));

      const items = [];
      for (const queueItem of selected) {
        let account = {
          billingFields: [],
          insurancePreview: [],
          accountSummary: { paymentStatus: 'unknown', clientBillingStatus: '', billProviderType: '', flags: [], needsReview: true, insuranceCount: 0, insurers: [] },
        };
        if (queueItem.billingHref) {
          const accountNav = await gotoWithBudget(session.page, queueItem.billingHref, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
          if (accountNav.ok) {
            const billingTab = await session.page.$('a[href*="#tabs-billing"]');
            if (billingTab) {
              await billingTab.click().catch(() => {});
              await sleep(1000);
            }
            const pageSummary = await collectPageSummary(session.page);
            const billingFields = await extractBillingFieldPairs(session.page);
            const insurancePreview = extractInsurancePreview(pageSummary);
            account = {
              billingFields,
              insurancePreview,
              accountSummary: {
                ...summarizeBillingAccount(billingFields),
                insuranceCount: insurancePreview.length,
                insurers: insurancePreview.map((item) => item.insuranceName).filter(Boolean),
              },
            };
          }
        }
        const diagnosis = diagnoseBillingIssue(queueItem, account);
        items.push({
          ...queueItem,
          ...account,
          diagnosis,
        });
      }

      return {
        ok: true,
        offset: Math.max(0, Number(offset) || 0),
        limit: Math.max(1, Math.min(Number(limit) || 15, 25)),
        totalVisibleQueueItems: queueItems.length,
        dashboardCounts: extractDashboardCounts(summary),
        items,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function buildFullAccountRescueReport({ maxPages = 8, pageTimeoutMs = 15000, accountLimit = 100 } = {}) {
    const result = await login({ dryRun: false });
    const { session } = result;
    try {
      const apiConfig = await captureBillingNotesApiConfig(session.page, { pageTimeoutMs });
      if (!apiConfig?.url) {
        return { ok: false, error: 'Could not capture ClientCare billing notes transport' };
      }
      const summary = await collectPageSummary(session.page);
      const queueItems = await fetchBillingNotesViaApi(session.page, apiConfig.url, { maxPages });
      if (!queueItems.length) {
        return { ok: false, error: 'Billing notes transport returned no records', transport: apiConfig.url };
      }

      const grouped = new Map();
      for (const item of queueItems) {
        const key = item.billingHref || item.client || item.noteHref;
        if (!grouped.has(key)) {
          grouped.set(key, {
            client: item.client,
            billingHref: item.billingHref,
            noteCount: 0,
            noteDates: [],
            notePreviews: [],
            noteAuthors: new Set(),
            forUsers: new Set(),
          });
        }
        const group = grouped.get(key);
        group.noteCount += 1;
        if (item.date) group.noteDates.push(item.date);
        if (item.notePreview) group.notePreviews.push(item.notePreview);
        if (item.by) group.noteAuthors.add(item.by);
        if (item.forUser) group.forUsers.add(item.forUser);
      }

      const groups = Array.from(grouped.values())
        .map((group) => ({
          ...group,
          oldestNoteDate: [...group.noteDates].sort()[0] || '',
          latestNoteDate: [...group.noteDates].sort().slice(-1)[0] || '',
        }))
        .sort((a, b) => String(b.latestNoteDate || '').localeCompare(String(a.latestNoteDate || '')))
        .slice(0, Math.max(1, Number(accountLimit) || 100));

      const accounts = [];
      for (const group of groups) {
        let account = {
          billingFields: [],
          insurancePreview: [],
          accountSummary: { paymentStatus: 'unknown', clientBillingStatus: '', billProviderType: '', flags: [], needsReview: true, insuranceCount: 0, insurers: [] },
        };
        if (group.billingHref) {
          const accountNav = await gotoWithBudget(session.page, group.billingHref, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
          if (accountNav.ok) {
            const billingTab = await session.page.$('a[href*="#tabs-billing"]');
            if (billingTab) {
              await billingTab.click().catch(() => {});
              await sleep(1000);
            }
            const pageSummary = await collectPageSummary(session.page);
            const billingFields = await extractBillingFieldPairs(session.page);
            const insurancePreview = extractInsurancePreview(pageSummary);
            account = {
              billingFields,
              insurancePreview,
              accountSummary: {
                ...summarizeBillingAccount(billingFields),
                insuranceCount: insurancePreview.length,
                insurers: insurancePreview.map((item) => item.insuranceName).filter(Boolean),
              },
            };
          }
        }

        const mergedQueueItem = {
          client: group.client,
          notePreview: group.notePreviews[0] || '',
          date: group.noteDates[0] || '',
        };
        const diagnosis = diagnoseBillingIssue(mergedQueueItem, account);
        const recoveryBand = inferRecoveryBand({
          ...account,
          diagnosis,
          oldestNoteDate: group.oldestNoteDate,
          date: mergedQueueItem.date,
        });
        accounts.push({
          client: group.client,
          billingHref: group.billingHref,
          noteCount: group.noteCount,
          oldestNoteDate: group.oldestNoteDate,
          latestNoteDate: group.latestNoteDate,
          noteDates: group.noteDates,
          notePreviews: Array.from(new Set(group.notePreviews)),
          noteAuthors: Array.from(group.noteAuthors),
          forUsers: Array.from(group.forUsers),
          billingFields: account.billingFields,
          insurancePreview: account.insurancePreview,
          accountSummary: account.accountSummary,
          diagnosis,
          recoveryBand,
        });
      }

      const summaryReport = buildFullReportSummary(accounts, queueItems);

      return {
        ok: true,
        transport: apiConfig.url,
        dashboardCounts: extractDashboardCounts(summary),
        totalQueueItems: queueItems.length,
        totalAccounts: accounts.length,
        summary: summaryReport,
        accounts,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function buildBacklogSummary({ maxPages = 12, pageTimeoutMs = 15000, accountLimit = 200, tenantId = null } = {}) {
    const result = await login({ dryRun: false, tenantId });
    const { session } = result;
    try {
      const apiConfig = await captureBillingNotesApiConfig(session.page, { pageTimeoutMs });
      if (!apiConfig?.url) {
        return { ok: false, error: 'Could not capture ClientCare billing notes transport' };
      }
      const summary = await collectPageSummary(session.page);
      const queueItems = await fetchBillingNotesViaApi(session.page, apiConfig.url, { maxPages });
      if (!queueItems.length) {
        return { ok: false, error: 'Billing notes transport returned no records', transport: apiConfig.url };
      }

      const grouped = new Map();
      for (const item of queueItems) {
        const key = item.billingHref || item.client || item.noteHref;
        if (!grouped.has(key)) {
          grouped.set(key, {
            client: item.client,
            billingHref: item.billingHref,
            noteCount: 0,
            noteDates: [],
            notePreviews: [],
            noteAuthors: new Set(),
            forUsers: new Set(),
          });
        }
        const group = grouped.get(key);
        group.noteCount += 1;
        if (item.date) group.noteDates.push(item.date);
        if (item.notePreview) group.notePreviews.push(item.notePreview);
        if (item.by) group.noteAuthors.add(item.by);
        if (item.forUser) group.forUsers.add(item.forUser);
      }

      const accounts = Array.from(grouped.values())
        .map((group) => {
          const oldestNoteDate = [...group.noteDates].sort()[0] || '';
          const latestNoteDate = [...group.noteDates].sort().slice(-1)[0] || '';
          const mergedQueueItem = {
            client: group.client,
            notePreview: group.notePreviews[0] || '',
            date: oldestNoteDate || '',
          };
          const accountSummary = {
            paymentStatus: 'unknown',
            clientBillingStatus: '',
            billProviderType: '',
            flags: [],
            needsReview: true,
            insuranceCount: 0,
            insurers: [],
          };
          const diagnosis = diagnoseBillingIssue(mergedQueueItem, { accountSummary, insurancePreview: [] });
          const recoveryBand = inferRecoveryBand({
            accountSummary,
            diagnosis,
            oldestNoteDate,
            date: mergedQueueItem.date,
          });
          return {
            client: group.client,
            billingHref: group.billingHref,
            noteCount: group.noteCount,
            oldestNoteDate,
            latestNoteDate,
            noteDates: group.noteDates,
            notePreviews: Array.from(new Set(group.notePreviews)),
            noteAuthors: Array.from(group.noteAuthors),
            forUsers: Array.from(group.forUsers),
            billingFields: [],
            insurancePreview: [],
            accountSummary,
            diagnosis,
            recoveryBand,
          };
        })
        .sort((a, b) => String(b.latestNoteDate || '').localeCompare(String(a.latestNoteDate || '')))
        .slice(0, Math.max(1, Number(accountLimit) || 200));

      return {
        ok: true,
        transport: apiConfig.url,
        dashboardCounts: extractDashboardCounts(summary),
        totalQueueItems: queueItems.length,
        totalAccounts: accounts.length,
        summary: buildFullReportSummary(accounts, queueItems),
        accounts,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function searchClientDirectory({ query = '', limit = 10, pageTimeoutMs = 15000, maxDirectoryItems = 250 } = {}) {
    const searchText = String(query || '').trim();
    if (!searchText) return { ok: false, error: 'query required', candidates: [] };
    const result = await login({ dryRun: false });
    const { session } = result;
    const cap = Math.max(25, Math.min(Number(maxDirectoryItems) || 250, 500));
    const pickLimit = Math.max(1, Math.min(Number(limit) || 10, 15));
    const surfacesTried = [];

    const scoreLinks = (directory, source) => directory
      .map((item) => {
        const score = Math.max(
          scoreDirectoryClientMatch(searchText, item.name),
          scoreDirectoryClientMatch(searchText, item.rawText || ''),
        );
        const href = item.href || (item.pregnancyId
          ? `https://clientcarewest.net/Pregnancy/ShowDefaultClientScreen/${item.pregnancyId}`
          : '');
        return {
          client: item.name,
          href,
          billingHref: deriveBillingHrefFromClientHref(href) || (item.pregnancyId
            ? `https://clientcarewest.net/Pregnancy/Billing/${item.pregnancyId}`
            : ''),
          pregnancyId: item.pregnancyId || pregnancyIdFromAnyHref(href),
          mrn: item.mrn,
          source,
          score,
          exactNameMatch: score >= 100,
        };
      })
      .filter((item) => item.score > 0 && item.pregnancyId)
      .sort((a, b) => b.score - a.score || String(a.client || '').localeCompare(String(b.client || '')))
      .slice(0, pickLimit);

    try {
      const origin = new URL(session.currentUrl()).origin;
      let prep = null;
      let typed = null;
      let directoryCount = 0;
      let candidates = [];

      // 1) Active Clients list (default) — Clear filter / View all / Inactive if present
      {
        const directoryNav = await gotoWithBudget(session.page, new URL('/Pregnancy?donotRedirect=Y', origin).toString(), {
          timeout: Math.max(5000, Number(pageTimeoutMs) || 15000),
        });
        surfacesTried.push({ surface: 'pregnancy_clients', ok: Boolean(directoryNav.ok), error: directoryNav.error || null });
        if (directoryNav.ok) {
          await sleep(1200);
          prep = await prepareClientDirectoryForSearch(session.page);
          typed = await typeClientDirectoryFilter(session.page, searchText);
          let directory = await extractClientDirectory(session.page, cap);
          if (!directory.length) {
            await prepareClientDirectoryForSearch(session.page);
            directory = await extractClientDirectory(session.page, cap);
          }
          const broad = await extractPregnancyChartLinks(session.page, cap);
          directory = [...directory, ...broad.filter((b) => !directory.some((d) => d.href === b.href))];
          directoryCount = Math.max(directoryCount, directory.length);
          candidates = scoreLinks(directory, 'client_directory_search');
        }
      }

      // 2) Advanced Client List — past / completed charts live here (was URL_KNOWN only)
      if (!candidates.length) {
        const advNav = await gotoWithBudget(
          session.page,
          new URL('/Pregnancy/ClientListReport?donotRedirect=Y', origin).toString(),
          { timeout: Math.max(8000, Number(pageTimeoutMs) || 15000) },
        );
        surfacesTried.push({ surface: 'advanced_client_list', ok: Boolean(advNav.ok), error: advNav.error || null });
        if (advNav.ok) {
          await sleep(1500);
          const advPrep = await prepareClientDirectoryForSearch(session.page);
          prep = { ...(prep || {}), advanced: advPrep };
          const advTyped = await typeClientDirectoryFilter(session.page, searchText);
          typed = { ...(typed || {}), advanced: advTyped };
          // Many reports need an explicit Filter/Search click after typing.
          await session.page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'))
              .find((el) => /^(filter|search|go|view|run|apply)$/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
            if (btn) {
              if (window.jQuery) window.jQuery(btn).trigger('click');
              else btn.click();
            }
          }).catch(() => null);
          await sleep(2000);
          const directory = await extractPregnancyChartLinks(session.page, cap);
          directoryCount = Math.max(directoryCount, directory.length);
          candidates = scoreLinks(directory, 'advanced_client_list');
        }
      }

      // 3) Birth Log Report — historical births with chart links
      if (!candidates.length) {
        const birthNav = await gotoWithBudget(
          session.page,
          new URL('/Report/BirthLogsReport', origin).toString(),
          { timeout: Math.max(8000, Number(pageTimeoutMs) || 15000) },
        );
        surfacesTried.push({ surface: 'birth_logs_report', ok: Boolean(birthNav.ok), error: birthNav.error || null });
        if (birthNav.ok) {
          await sleep(1500);
          await typeClientDirectoryFilter(session.page, searchText);
          await session.page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'))
              .find((el) => /^(filter|search|go|view|run|apply)$/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
            if (btn) {
              if (window.jQuery) window.jQuery(btn).trigger('click');
              else btn.click();
            }
          }).catch(() => null);
          await sleep(2000);
          const directory = await extractPregnancyChartLinks(session.page, cap);
          directoryCount = Math.max(directoryCount, directory.length);
          candidates = scoreLinks(directory, 'birth_logs_report');
        }
      }

      return {
        ok: true,
        query: searchText,
        prep,
        typed,
        directoryCount,
        surfacesTried,
        candidates,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function buildBillingOverview({ includeScreenshots = false, pageTimeoutMs = 15000 } = {}) {
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const landing = result.page || await collectPageSummary(session.page);
      const origin = new URL(landing.url || session.currentUrl()).origin;
      const routes = [
        { id: 'billing_home', label: 'Billing Home', href: '/Home/BillingPartial' },
        { id: 'sent_bills', label: 'Review Sent Bills', href: '/Billing/BillingListView' },
        { id: 'remittance', label: 'Record Insurance Payment', href: '/Billing/RecordRemittanceAdvice' },
        { id: 'charge_slip', label: 'Billing Slip', href: '/Company/ChargeSlip' },
      ];
      const pages = [];
      for (const route of routes) {
        const target = new URL(route.href, `${origin}/`).toString();
        const nav = await gotoWithBudget(session.page, target, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
        if (!nav.ok) {
          pages.push({ ...route, href: target, ok: false, error: nav.error });
          continue;
        }
        const summary = await collectPageSummary(session.page);
        let shot = null;
        if (includeScreenshots) {
          shot = await screenshotPath(`clientcare-overview-${route.id}`);
          await safeScreenshot(session.page, shot);
          screenshots.push(shot);
        }
        pages.push({
          ...route,
          href: target,
          ok: true,
          page: summary,
          state: derivePageState(summary),
          screenshot: shot,
        });
      }
      return {
        ok: true,
        landing,
        dashboardCounts: extractDashboardCounts(landing),
        pages,
        screenshots,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function inspectBillingNotesTransport({ pageTimeoutMs = 15000 } = {}) {
    const result = await login({ dryRun: false });
    const { session } = result;
    const responses = [];
    const seen = new Set();
    const handler = async (response) => {
      try {
        const request = response.request();
        const type = request.resourceType();
        const url = response.url();
        if (!/clientcarewest\.net/i.test(url)) return;
        if (!['xhr', 'fetch', 'document', 'script'].includes(type)) return;
        const key = `${type}|${url}`;
        if (seen.has(key)) return;
        seen.add(key);
        const contentType = response.headers()['content-type'] || '';
        let snippet = '';
        if (/json|javascript|html|text/i.test(contentType)) {
          try {
            snippet = (await response.text()).slice(0, 500);
          } catch (_) {
            // ignore body read issues
          }
        }
        responses.push({
          url,
          status: response.status(),
          type,
          contentType,
          snippet,
        });
      } catch (_) {
        // ignore diagnostic capture issues
      }
    };

    session.page.on('response', handler);
    try {
      const billingHome = new URL('/Home/BillingPartial', session.currentUrl()).toString();
      const nav = await gotoWithBudget(session.page, billingHome, { timeout: Math.max(5000, Number(pageTimeoutMs) || 15000) });
      if (!nav.ok) return { ok: false, error: nav.error };
      await waitForBillingHome(session.page, Math.max(5000, Number(pageTimeoutMs) || 15000));
      await sleep(1500);
      const summary = await collectPageSummary(session.page);
      const diagnostics = await extractBillingNotesDiagnostics(session.page);
      return {
        ok: true,
        page: summary,
        diagnostics,
        responses,
      };
    } finally {
      session.page.off('response', handler);
      await session.close().catch(() => {});
    }
  }

  async function extractClaimTables({ importIntoQueue = false, maxCandidates = 2, includeScreenshots = false, pageTimeoutMs = 20000 } = {}) {
    if (!syncService) throw new Error('ClientCare sync service not configured');
    const discovery = await discoverBillingSurface({ maxCandidates, includeScreenshots, pageTimeoutMs });
    const pages = [discovery.landing, ...(discovery.visited || [])];
    const extracted = [];
    for (const page of pages) {
      const fromTables = Array.isArray(page.tables)
        ? page.tables.flatMap((table) => syncService.parseSnapshot({ rows: table.length > 1 ? [Object.fromEntries(table[0].map((h, i) => [h, table[1]?.[i] || '']))] : [], source: 'browser_table_preview' }))
        : [];
      const fromHtml = syncService.parseSnapshot({ html: `<table>${(page.tables || []).map((table) => table.map((row) => `<tr>${row.map((cell) => `<td>${String(cell || '').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')).join('')}</table>`, source: 'browser_html_preview' });
      extracted.push({
        url: page.url,
        title: page.title,
        parsedClaims: fromHtml.length || fromTables.length,
        preview: (fromHtml.length ? fromHtml : fromTables).slice(0, 20),
      });
    }

    let imported = null;
    if (importIntoQueue) {
      const snapshots = [];
      for (const page of pages) {
        for (const table of page.tables || []) {
          snapshots.push(syncService.parseSnapshot({ rows: table.length > 1 ? table.slice(1).map((row) => Object.fromEntries(table[0].map((h, i) => [h, row[i] || '']))) : [], source: 'browser_snapshot' }));
        }
      }
      const flat = snapshots.flat();
      imported = await syncService.importSnapshot({ rows: flat, source: 'browser_snapshot' });
    }

    return {
      ok: true,
      discovery,
      extracted,
      imported,
    };
  }

  function guessMotherNameFromBirthCells(cells = []) {
    const noise = /^(admitted|discharged|home|hospital|birth|baby|babies|born|location|midwife|provider|date|time|status|name|mrn#?:?|dob:?|age)(\s|$)/i;
    const noisePhrase = /admitted|discharged|^mrn#?|^dob:?/i;
    const staff = /^(sherry|cora)\b/i;
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const raw of cells) {
      const cell = String(raw || '').trim().replace(/\s+/g, ' ');
      if (!cell || noise.test(cell) || noisePhrase.test(cell) || /^\d/.test(cell) || staff.test(cell)) continue;
      if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(cell)) continue;
      if (/^mrn#?:?/i.test(cell) || /^dob:?/i.test(cell) || uuidLike.test(cell)) continue;
      // "Amanda Winkels Amanda Winkels" → first two tokens once
      const tokens = cell.replace(/\.{2,}$/, '').replace(/^mrn#?:?\s*/i, '').split(/\s+/).filter(Boolean);
      if (tokens.some((t) => uuidLike.test(t))) continue;
      if (tokens.length >= 2 && /^[A-Za-z]/.test(tokens[0]) && /^[A-Za-z]/.test(tokens[1])) {
        const a = tokens[0];
        const b = tokens[1];
        if (tokens[2] === a && tokens[3] === b) return `${a} ${b}`;
        return `${a} ${b}`;
      }
      if (tokens.length === 1 && tokens[0].length >= 3 && /^[A-Za-z]/.test(tokens[0])) return tokens[0];
    }
    return null;
  }

  /**
   * Scan Birth Activity for recent births → resolve billing hrefs via row links
   * or client-directory name match (money path for unpaid births not in old notes queue).
   */
  async function scanBirthActivity({
    maxRows = 40,
    pageTimeoutMs = 20000,
    resolveDirectory = true,
    maxNameResolves = 12,
    tenantId = null,
  } = {}) {
    const result = await login({ dryRun: false, tenantId });
    const { session, screenshots } = result;
    try {
      const target = new URL('/Home/BirthActivityPartial', session.currentUrl()).toString();
      const nav = await gotoWithBudget(session.page, target, {
        timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
      });
      if (!nav.ok) return { ok: false, error: nav.error, screenshots };
      await sleep(2500);
      try { await dismissSessionTakeover(session.page); } catch (_) { /* ignore */ }

      // Tip 2026-07-15: page shell loads with "Babies Born" heading but empty grid until widget click / date range.
      await session.page.evaluate(() => {
        const want = /babies\s*born|birth\s*activity|this\s*month|year\s*to\s*date|last\s*90|all\s*births/i;
        const nodes = Array.from(document.querySelectorAll('a, button, span, li, div[role="tab"], .k-link'));
        for (const el of nodes) {
          const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
          if (!text || text.length > 60) continue;
          if (!want.test(text)) continue;
          if (el.offsetParent === null && el.getClientRects().length === 0) continue;
          el.click();
        }
      }).catch(() => {});
      await sleep(2000);

      const rows = await session.page.evaluate((max) => {
        const out = [];
        const seen = new Set();
        const push = (row) => {
          const key = `${row.birthDateGuess || ''}|${(row.text || '').slice(0, 80)}`;
          if (seen.has(key)) return;
          seen.add(key);
          out.push(row);
        };

        const rowNodes = Array.from(document.querySelectorAll('table tr, .k-grid-content tr, [role="row"], .list-group-item, li'));
        for (const tr of rowNodes) {
          const cells = Array.from(tr.querySelectorAll('td, [role="gridcell"], span, div'))
            .map((td) => (td.innerText || '').trim().replace(/\s+/g, ' '))
            .filter((t) => t && t.length < 120);
          if (cells.length < 1) continue;
          const text = (tr.innerText || cells.join(' | ')).replace(/\s+/g, ' ').trim();
          if (text.length < 8) continue;
          const dateMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
          // Prefer dated rows; also keep mother-like rows with pregnancy links.
          const link =
            tr.querySelector('a[href*="ShowDefaultClientScreen"]') ||
            tr.querySelector('a[href*="/Pregnancy/"]') ||
            tr.querySelector('a[href*="pregnancyID=" i]');
          if (!dateMatch && !link) continue;
          const linkName = (link?.textContent || '').trim().replace(/\s+/g, ' ').split('MRN')[0].trim();
          const cellList = cells.slice(0, 8);
          if (linkName && !/^dob:?$/i.test(linkName)) cellList.unshift(linkName);
          push({
            cells: cellList,
            text: text.slice(0, 320),
            clientHref: link?.href || null,
            birthDateGuess: dateMatch?.[1] || null,
            linkName: linkName || null,
          });
          if (out.length >= max) break;
        }

        // Fallback: any pregnancy client links near a date on the page body.
        if (!out.length) {
          const body = (document.body?.innerText || '').replace(/\s+/g, ' ');
          const links = Array.from(document.querySelectorAll('a[href*="ShowDefaultClientScreen"], a[href*="/Pregnancy/Billing/"]'));
          for (const link of links) {
            const nearby = ((link.closest('tr,li,div')?.innerText) || link.textContent || '').replace(/\s+/g, ' ').trim();
            const dateMatch = nearby.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/)
              || body.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
            push({
              cells: [nearby.slice(0, 80)],
              text: nearby.slice(0, 320),
              clientHref: link.href || null,
              birthDateGuess: dateMatch?.[1] || null,
            });
            if (out.length >= max) break;
          }
        }
        return out;
      }, Math.max(1, Math.min(Number(maxRows) || 40, 100)));

      let directory = [];
      const needResolve = resolveDirectory !== false && rows.some((r) => !r.clientHref);
      const directoryPrep = { cleared: false, perNameSearches: 0 };
      if (needResolve) {
        const dirNav = await gotoWithBudget(
          session.page,
          new URL('/Pregnancy?donotRedirect=Y', session.currentUrl()).toString(),
          { timeout: Math.max(5000, Number(pageTimeoutMs) || 20000) }
        );
        if (dirNav.ok) {
          await sleep(1500);
          const prep = await prepareClientDirectoryForSearch(session.page);
          directoryPrep.cleared = Boolean(prep?.clicked);
          directory = await extractClientDirectory(session.page, 500);

          // Paginate "next" a few times to capture more of the all-clients list.
          for (let pageNum = 0; pageNum < 8 && directory.length < 400; pageNum += 1) {
            const advanced = await session.page.evaluate(() => {
              const next =
                document.querySelector('a[title*="next" i], button[title*="next" i], .k-i-arrow-e, .k-pager-nav[aria-label*="next" i]') ||
                Array.from(document.querySelectorAll('a, button')).find((el) => /^go to the next page$/i.test((el.textContent || '').trim()) || /^›$|^»$|^>$/.test((el.textContent || '').trim()));
              if (!next || next.getAttribute('aria-disabled') === 'true' || next.classList.contains('k-state-disabled')) {
                return false;
              }
              next.click();
              return true;
            });
            if (!advanced) break;
            await sleep(1200);
            const more = await extractClientDirectory(session.page, 500);
            const seen = new Set(directory.map((d) => d.href));
            for (const item of more) {
              if (!seen.has(item.href)) directory.push(item);
            }
          }
        }
      }

      const births = [];
      let nameResolveBudget = Math.max(0, Math.min(Number(maxNameResolves) || 12, 25));
      for (const row of rows) {
        const motherNameGuess = (row.linkName && !/^(dob:?|mrn#?)/i.test(String(row.linkName).trim()))
          ? String(row.linkName).trim().split(/\s+/).slice(0, 2).join(' ')
          : guessMotherNameFromBirthCells(row.cells || []);
        let clientHref = row.clientHref || null;
        let billingHref = clientHref ? deriveBillingHrefFromClientHref(clientHref) : null;
        let resolve = clientHref ? { method: 'row_link' } : null;
        if (!billingHref && motherNameGuess && directory.length) {
          const scored = directory
            .map((item) => ({
              ...item,
              score: scoreDirectoryClientMatch(motherNameGuess, item.name),
            }))
            .filter((item) => item.score >= 55)
            .sort((a, b) => b.score - a.score);
          const best = scored[0];
          if (best) {
            clientHref = best.href;
            billingHref = deriveBillingHrefFromClientHref(best.href);
            resolve = {
              method: 'directory_name',
              query: motherNameGuess,
              score: best.score,
              matchedName: best.name,
              mrn: best.mrn,
            };
          }
        }
        // Per-name filter search when bulk directory miss (postpartum moms often off first pages).
        if (!billingHref && motherNameGuess && needResolve && nameResolveBudget > 0) {
          nameResolveBudget -= 1;
          directoryPrep.perNameSearches += 1;
          await typeClientDirectoryFilter(session.page, motherNameGuess);
          const filtered = await extractClientDirectory(session.page, 80);
          const scored = filtered
            .map((item) => ({
              ...item,
              score: scoreDirectoryClientMatch(motherNameGuess, item.name),
            }))
            .filter((item) => item.score >= 55)
            .sort((a, b) => b.score - a.score);
          const best = scored[0];
          if (best) {
            clientHref = best.href;
            billingHref = deriveBillingHrefFromClientHref(best.href);
            resolve = {
              method: 'directory_filter',
              query: motherNameGuess,
              score: best.score,
              matchedName: best.name,
              mrn: best.mrn,
            };
            if (!directory.some((d) => d.href === best.href)) directory.push(best);
          } else {
            resolve = resolve || { method: 'directory_miss', query: motherNameGuess };
          }
        } else if (!billingHref && motherNameGuess) {
          resolve = resolve || {
            method: nameResolveBudget <= 0 ? 'resolve_budget_exhausted' : 'directory_miss',
            query: motherNameGuess,
          };
        }
        births.push({
          ...row,
          motherNameGuess,
          clientHref,
          billingHref,
          resolve,
        });
      }

      const page = await collectPageSummary(session.page);
      return {
        ok: true,
        url: target,
        page: { url: page.url, title: page.title, headings: page.headings },
        count: births.length,
        resolved: births.filter((b) => b.billingHref).length,
        directoryCount: directory.length,
        directoryPrep,
        births,
        screenshots,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  /**
   * Prepare claim-ready status on a billing account: set Client Billing Status + Bill Provider Type.
   * Does not flip payment_status (that means money received).
   */
  /**
   * Map / seed Charge Slip for a known pregnancy. Vendor SuperBill SPA URL 500s;
   * ChargeSlip is the working create surface: DateFilter + PersonId load visit rows,
   * click patient visit, set ChargeSlipId care type, then Save.
   */
  async function mapChargeSlip({
    pregnancyId = null,
    patientQuery = '',
    careType = 'Intrapartum Care',
    visitDate = null,
    visitDates = [],
    scanDays = 21,
    dryRun = true,
    pageTimeoutMs = 20000,
  } = {}) {
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const origin = new URL(session.currentUrl()).origin;
      let bornDate = null;
      // Skip chart Born lookup when visitDate is already known — tip proved chart nav can stall under session-takeover load.
      if (pregnancyId && !visitDate) {
        const billingHref = `${origin}/Pregnancy/Billing/${encodeURIComponent(pregnancyId)}`;
        const chartNav = await gotoWithBudget(session.page, billingHref, {
          timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
        });
        if (chartNav.ok) {
          await sleep(1200);
          await dismissSessionTakeover(session.page);
          bornDate = await session.page.evaluate(() => {
            const text = (document.body?.innerText || '').replace(/\s+/g, ' ');
            return (text.match(/Born[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i) || [])[1] || null;
          });
        }
      }

      const qs = pregnancyId ? `?pregnancyId=${encodeURIComponent(pregnancyId)}` : '';
      const target = `${origin}/Company/ChargeSlip${qs}`;
      const nav = await gotoWithBudget(session.page, target, {
        timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
      });
      if (!nav.ok) return { ok: false, error: nav.error, screenshots };

      await sleep(1500);
      await dismissSessionTakeover(session.page);

      const providerSet = await session.page.evaluate(() => {
        const sel = document.getElementById('PersonId');
        if (!sel) return { set: false };
        const option = Array.from(sel.options || []).find((o) => /^all$/i.test((o.textContent || '').trim())) || sel.options?.[0];
        if (!option) return { set: false };
        sel.value = option.value;
        Array.from(sel.options || []).forEach((o) => { o.selected = o === option; });
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return { set: true, text: (option.textContent || '').trim(), value: option.value };
      });

      const dateCandidates = buildVisitDateCandidates({
        visitDate: visitDate || bornDate,
        visitDates: [bornDate, ...(visitDates || [])].filter(Boolean),
        scanDays: pregnancyId ? Math.max(0, Number(scanDays) || 0) : 0,
      });
      if (!dateCandidates.length) {
        return {
          ok: false,
          error: 'visit_date required (or Born date readable from billing chart)',
          pregnancyId,
          bornDate,
          screenshots,
        };
      }

      let visitList = null;
      let dateSet = { set: false };
      let matchedDate = null;
      for (const candidate of dateCandidates) {
        dateSet = await session.page.evaluate((rawDate) => {
          const input =
            document.querySelector('input[name="DateFilter"]') ||
            Array.from(document.querySelectorAll('input')).find((el) => /date/i.test(`${el.id} ${el.name} ${el.placeholder || ''}`));
          if (!input) return { set: false };
          const value = String(rawDate || '').trim() || input.value || '';
          if (!value) return { set: false, reason: 'no_date_value' };
          input.focus();
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return { set: true, value };
        }, candidate);
        await sleep(400);

        visitList = await session.page.evaluate(async ({ providerId, dateSelection, wantPregnancyId, wantName, requireId }) => {
          const pid = providerId || '00000000-0000-0000-0000-000000000000';
          const date = dateSelection || '';
          if (!date) return { ok: false, error: 'date required' };
          const url = `/Company/SearchBillingSlipPregnancyList?PrividerId=${encodeURIComponent(pid)}&DateSelection=${encodeURIComponent(date)}&_=${Date.now()}`;
          const res = await fetch(url, { credentials: 'same-origin' });
          const text = await res.text();
          let data = null;
          try { data = JSON.parse(text); } catch { data = text.slice(0, 500); }
          const rows = Array.isArray(data)
            ? data
            : (data?.Data || data?.data || data?.Items || data?.items || []);
          const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
            pregnancyId: row.PregnancyID || row.PregnancyId || row.pregnancyId || row.Id || row.id || null,
            name: row.FullName || row.PatientName || row.ClientName || row.Name || row.name || null,
            time: row.StartTimeStr || row.Time || row.VisitTime || row.time || null,
            visit: row.Visit || row.VisitType || row.DefaultCategory || row.visit || null,
            chargeSlipId: row.ChargeSlipId || null,
            scheduledEventId: row.ScheduledEventID || row.ScheduledEventId || null,
            rawKeys: Object.keys(row || {}).slice(0, 20),
            raw: row,
          }));
          const wantId = String(wantPregnancyId || '').toLowerCase();
          const want = String(wantName || '').toLowerCase();
          let match = null;
          if (wantId) {
            match = normalized.find((r) => String(r.pregnancyId || '').toLowerCase() === wantId) || null;
          } else if (want) {
            match = normalized.find((r) => String(r.name || '').toLowerCase().includes(want)) || null;
          }
          if (requireId && wantId && !match) {
            return {
              ok: res.ok,
              status: res.status,
              url,
              count: normalized.length,
              sample: normalized.slice(0, 8).map(({ raw, ...rest }) => rest),
              match: null,
              selected: { applied: false, reason: 'pregnancy_id_not_in_visit_list' },
            };
          }

          let selected = { applied: false, deferred: true };
          // Do NOT call selectClick here — tip proved it can hang the Puppeteer evaluate
          // (sync vendor work). Bind only in the post-match rebind step with a Node timeout.
          if (match?.pregnancyId) {
            selected = {
              applied: false,
              deferred: true,
              pregnancyId: match.pregnancyId,
              scheduledEventId: match.scheduledEventId,
              name: match.name,
            };
          }
          return {
            ok: res.ok,
            status: res.status,
            url,
            count: normalized.length,
            sample: normalized.slice(0, 8).map(({ raw, ...rest }) => rest),
            match: match ? {
              pregnancyId: match.pregnancyId,
              name: match.name,
              time: match.time,
              visit: match.visit,
              chargeSlipId: match.chargeSlipId,
              scheduledEventId: match.scheduledEventId,
            } : null,
            selected,
            dataKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data).slice(0, 20) : null,
          };
        }, {
          providerId: providerSet?.value || '00000000-0000-0000-0000-000000000000',
          dateSelection: dateSet?.value || candidate,
          wantPregnancyId: pregnancyId,
          wantName: patientQuery,
          requireId: Boolean(pregnancyId),
        });

        if (visitList?.match?.pregnancyId) {
          matchedDate = candidate;
          break;
        }
      }
      let preBindChargeOpts = [];
      if (visitList?.match?.pregnancyId) {
        // Ensure DOM date matches the API day, then re-bind with the matched visit row.
        await session.page.evaluate((rawDate) => {
          const input =
            document.querySelector('input[name="DateFilter"]') ||
            Array.from(document.querySelectorAll('input')).find((el) => /date/i.test(`${el.id} ${el.name} ${el.placeholder || ''}`));
          if (!input || !rawDate) return;
          input.value = rawDate;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          try { window.$(input).trigger('change'); } catch (_) { /* ignore */ }
        }, matchedDate);
        await sleep(2000);
        preBindChargeOpts = await session.page.evaluate(() => {
          const sel = document.getElementById('ChargeSlipId');
          return Array.from(sel?.options || []).map((o) => ({
            text: (o.textContent || '').trim(),
            value: o.value,
          })).filter((o) => o.text && o.value);
        });
        // Bound with Node-side timeout — selectClick can hang Puppeteer evaluate.
        const rebindPromise = session.page.evaluate(async ({ wantName }) => {
          const attempts = [];
          const needle = String(wantName || '').toLowerCase().split(/\s+/).find((p) => p.length > 2);
          const rowCandidates = Array.from(document.querySelectorAll('table tr, .k-grid-content tr, [role="row"], .hover-select'))
            .map((tr) => {
              const t = (tr.innerText || '').replace(/\s+/g, ' ').trim();
              const cells = tr.querySelectorAll('td, [role="gridcell"]').length;
              return { tr, t, cells, score: (needle && t.toLowerCase().includes(needle) ? 10 : 0) + (/\b\d{1,2}:\d{2}\b/.test(t) ? 5 : 0) + (cells >= 2 && cells <= 8 ? 3 : 0) + (tr.classList?.contains('hover-select') ? 2 : 0) - Math.min(t.length, 400) / 100 };
            })
            .filter((r) => r.score >= 15)
            .sort((a, b) => b.score - a.score);
          const rowEl = rowCandidates[0]?.tr || null;
          if (!rowEl) return { ok: false, reason: 'row_not_in_dom', attempts };
          attempts.push({
            label: 'row_target',
            ok: true,
            text: (rowEl.innerText || '').replace(/\s+/g, ' ').slice(0, 80),
            onclick: (rowEl.getAttribute('onclick') || '').slice(0, 80),
          });
          // Native click fires onclick="selectClick(this)" with correct this-binding.
          rowEl.click();
          attempts.push({ label: 'row_click', ok: true });
          for (let i = 0; i < 24; i += 1) {
            await new Promise((r) => setTimeout(r, 250));
            const fullNameText = (document.getElementById('FullNameText')?.textContent || '').trim();
            if (fullNameText) {
              return {
                ok: true,
                attempts,
                fullNameText: fullNameText.slice(0, 80),
                patientLine: fullNameText.slice(0, 80),
                patientSelected: true,
              };
            }
          }
          const fullNameText = (document.getElementById('FullNameText')?.textContent || '').trim();
          return {
            ok: Boolean(fullNameText),
            attempts,
            fullNameText: fullNameText.slice(0, 80),
            patientLine: fullNameText.slice(0, 80),
            patientSelected: Boolean(fullNameText),
            reason: fullNameText ? null : 'fullnameNameText_empty_after_click',
          };
        }, { wantName: visitList.match?.name || patientQuery });
        const rebind = await Promise.race([
          rebindPromise,
          sleep(12000).then(() => ({ ok: false, timedOut: true, reason: 'selectClick_or_row_click_timeout' })),
        ]);
        visitList = { ...visitList, rebind };
        if (rebind?.patientSelected) {
          visitList.selected = { ...(visitList.selected || {}), applied: true, via: 'row_click', patientLine: rebind.patientLine || rebind.fullNameText };
        }
        await sleep(800);
      } else if (visitList?.selected?.applied) {
        await sleep(1500);
      }

      // Fail-closed: never DOM-click a random visit when pregnancyId was requested.
      let visitClick = { clicked: false, skipped: true, reason: pregnancyId ? 'require_pregnancy_id_match' : null };
      if (!pregnancyId && !visitList?.selected?.applied && (visitList?.count || 0) > 0) {
        visitClick = await session.page.evaluate((q) => {
          const want = String(q || '').trim().toLowerCase();
          const rows = Array.from(document.querySelectorAll('table tr, .k-grid-content tr, [role="row"]'));
          const scored = [];
          for (const tr of rows) {
            const cells = Array.from(tr.querySelectorAll('td, [role="gridcell"]'))
              .map((td) => (td.innerText || '').trim().replace(/\s+/g, ' '))
              .filter(Boolean);
            if (cells.length < 2) continue;
            const text = cells.join(' | ');
            if (/no results found/i.test(text)) continue;
            if (!/\b\d{1,2}:\d{2}\b/.test(text) && !(want && text.toLowerCase().includes(want))) continue;
            let score = 1;
            if (want && text.toLowerCase().includes(want)) score += 10;
            scored.push({ tr, cells: cells.slice(0, 6), text: text.slice(0, 160), score });
          }
          scored.sort((a, b) => b.score - a.score);
          const best = scored[0];
          if (!best) return { clicked: false, candidates: 0 };
          best.tr.click();
          return { clicked: true, candidates: scored.length, cells: best.cells, text: best.text, score: best.score };
        }, patientQuery);
        if (visitClick?.clicked) await sleep(1500);
      }

      const typed = { typed: false, skipped: true };
      const hiddenForce = pregnancyId && visitList?.match?.pregnancyId
        ? await session.page.evaluate((id) => {
            const ids = ['PregnancyId', 'PregnancyID', 'pregnancyId', 'PatientId', 'PatientID', 'ClientId'];
            const set = [];
            for (const name of ids) {
              const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
              if (!el) continue;
              el.value = id;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              set.push(name);
            }
            return { set };
          }, String(pregnancyId))
        : { set: [], skipped: true, reason: pregnancyId ? 'no_visit_match' : 'no_pregnancy_id' };

      const chargeSlipType = await session.page.evaluate(({ wantType, preOpts }) => {
        const sel = document.getElementById('ChargeSlipId');
        if (!sel) return { set: false };
        const want = String(wantType || 'Intrapartum Care').toLowerCase();
        let opts = Array.from(sel.options || []);
        let option = opts.find((o) => (o.textContent || '').toLowerCase().includes(want))
          || (want.includes('intrapartum') ? opts.find((o) => /^intrapartum/i.test((o.textContent || '').trim())) : null);
        // After patient bind, vendor filters ChargeSlipId and may drop Intrapartum — reinject from pre-bind list.
        if (!option && Array.isArray(preOpts)) {
          const stash = preOpts.find((o) => String(o.text || '').toLowerCase().includes(want))
            || (want.includes('intrapartum') ? preOpts.find((o) => /^intrapartum/i.test(String(o.text || '').trim())) : null);
          if (stash?.value) {
            const exists = opts.some((o) => o.value === stash.value);
            if (!exists) {
              const added = document.createElement('option');
              added.value = stash.value;
              added.textContent = stash.text;
              sel.appendChild(added);
            }
            option = Array.from(sel.options || []).find((o) => o.value === stash.value) || null;
          }
        }
        if (!option) {
          return {
            set: false,
            available: Array.from(sel.options || []).map((o) => (o.textContent || '').trim()).filter(Boolean),
            preBindAvailable: (preOpts || []).map((o) => o.text).filter(Boolean),
          };
        }
        sel.value = option.value;
        Array.from(sel.options || []).forEach((o) => { o.selected = o === option; });
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        try { window.$(sel).trigger('change'); } catch (_) { /* ignore */ }
        try { if (typeof window.changeChargeSlipId === 'function') window.changeChargeSlipId(); } catch (_) { /* ignore */ }
        return { set: true, text: (option.textContent || '').trim(), value: option.value, reinjected: Boolean(preOpts?.length) };
      }, { wantType: careType, preOpts: preBindChargeOpts || [] });
      if (chargeSlipType?.set) await sleep(2500);

      // After care-type change, vendor refreshPageGrid should populate procedure/diagnosis lists.
      const codesMap = await session.page.evaluate(() => {
        const sectionInfo = (id) => {
          const root = document.getElementById(id);
          if (!root) return { present: false };
          const text = (root.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400);
          const clickables = Array.from(root.querySelectorAll('[data-id], [data-text], .data-service-identity-class, tr, li, a, button, input[type="checkbox"]'))
            .map((el) => ({
              tag: el.tagName,
              text: (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 80),
              dataId: el.getAttribute('data-id') || null,
              dataText: el.getAttribute('data-text') || null,
              dataType: el.getAttribute('data-type') || null,
              onclick: (el.getAttribute('onclick') || '').slice(0, 80),
            }))
            .filter((x) => x.text || x.dataId || x.dataText)
            .slice(0, 25);
          return { present: true, text, clickables };
        };
        const searchOpts = Array.from(document.getElementById('SearchService')?.options || [])
          .map((o) => ({ text: (o.textContent || '').trim(), value: o.value }))
          .filter((o) => o.text && o.value && o.value !== '00000000-0000-0000-0000-000000000000')
          .slice(0, 30);
        const digOpts = Array.from(document.getElementById('DignosticService')?.options || [])
          .map((o) => ({ text: (o.textContent || '').trim(), value: o.value }))
          .filter((o) => o.text && o.value && o.value !== '00000000-0000-0000-0000-000000000000')
          .slice(0, 30);
        return {
          procedure: sectionInfo('procedure-codes-section'),
          diagnosis: sectionInfo('diagnosis-codes-section'),
          searchOpts,
          digOpts,
          fn: {
            digSelectionProcess: typeof window.digSelectionProcess === 'function',
            changeChargeSlipId: typeof window.changeChargeSlipId === 'function',
            refreshPageGrid: typeof window.refreshPageGrid === 'function',
          },
        };
      });

      let codesSelected = { procedure: null, diagnosis: null, attempts: [] };
      try {
        codesSelected = await evaluateWithTimeout(session.page, async () => {
        const attempts = [];
        const isDateMaskInput = (el) => {
          if (!el) return true;
          const v = String(el.value || el.placeholder || '');
          const id = `${el.id || ''} ${el.name || ''} ${el.className || ''} ${el.getAttribute?.('data-mask') || ''}`;
          return /date|dob|born|__/i.test(id) || /_\/__\/____|mm\/dd\/yyyy/i.test(v) || el.type === 'date';
        };
        const pickFromSelect = (selId, label, preferRe, excludeRe = null) => {
          const sel = document.getElementById(selId);
          if (!sel) return null;
          const opts = Array.from(sel.options || []).filter((o) => {
            const t = (o.textContent || '').trim();
            const v = o.value || '';
            return t && v && v !== '00000000-0000-0000-0000-000000000000' && !/create-new|^select/i.test(t);
          });
          const preferred = preferRe
            ? opts.find((o) => {
              const t = (o.textContent || '').trim();
              return preferRe.test(t) && !(excludeRe && excludeRe.test(t));
            })
            : null;
          const opt = preferred
            || opts.find((o) => !/^(000|001)\b|deductible|coinsurance|59080|initial day labor/i.test((o.textContent || '').trim()))
            || opts[0];
          if (!opt) return null;
          sel.value = opt.value;
          Array.from(sel.options || []).forEach((o) => { o.selected = o === opt; });
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          try { window.$(sel).trigger('change'); } catch (_) { /* ignore */ }
          attempts.push({
            label,
            ok: true,
            text: (opt.textContent || '').trim().slice(0, 80),
            value: opt.value,
            preferred: Boolean(preferred),
          });
          return { text: (opt.textContent || '').trim().slice(0, 80), value: opt.value };
        };
        const clickAddNear = (anchorId, label) => {
          const anchor = document.getElementById(anchorId);
          const roots = [anchor, anchor?.closest('form, .panel, .card, .row, section, div'), document.body].filter(Boolean);
          for (const root of roots) {
            const btn = Array.from(root.querySelectorAll('button, input[type="button"], input[type="submit"], a, span[onclick], i[onclick]'))
              .find((el) => {
                const t = `${el.textContent || el.value || el.title || el.getAttribute('aria-label') || ''} ${el.className || ''}`.trim();
                if (/remittance|era|payment|print|delete|remove|cancel/i.test(t)) return false;
                return /^(add|\+)$/i.test(t) || /^add\s+(service|code|procedure|diagnosis|cpt|icd)/i.test(t) || /fa-plus|glyphicon-plus|icon-plus/i.test(t);
              });
            if (!btn) continue;
            try {
              btn.click();
              attempts.push({ label, ok: true, text: (btn.textContent || btn.value || btn.className || 'add').toString().slice(0, 60) });
              return true;
            } catch (err) {
              attempts.push({ label, ok: false, error: String(err?.message || err).slice(0, 100) });
            }
          }
          attempts.push({ label, ok: false, error: 'no_add_button' });
          return false;
        };
        const callHelpers = (names, label) => {
          for (const name of names) {
            if (typeof window[name] !== 'function') continue;
            try {
              window[name]();
              attempts.push({ label: `${label}:${name}`, ok: true });
              return name;
            } catch (err) {
              attempts.push({ label: `${label}:${name}`, ok: false, error: String(err?.message || err).slice(0, 100) });
            }
          }
          return null;
        };
        const clickFirst = (rootId, label, preferRe = null) => {
          const root = document.getElementById(rootId);
          if (!root) {
            attempts.push({ label, ok: false, error: 'root_missing' });
            return null;
          }
          const nodes = Array.from(root.querySelectorAll('[data-id], [data-text], [onclick*="digSelection"], [onclick*="Selection"], tr, li, a, button'));
          const scored = nodes
            .map((node) => {
              const t = `${node.innerText || node.value || ''} ${node.getAttribute('data-text') || ''} ${node.getAttribute('data-id') || ''}`.replace(/\s+/g, ' ').trim();
              if (!t || /no results/i.test(t)) return null;
              if (!(node.getAttribute('data-id') || node.getAttribute('onclick') || node.tagName === 'TR')) return null;
              const preferred = preferRe ? preferRe.test(t) : false;
              return { node, t, preferred, dataId: node.getAttribute('data-id') };
            })
            .filter(Boolean);
          const hit = (preferRe && scored.find((x) => x.preferred)) || scored[0];
          if (!hit) {
            attempts.push({ label, ok: false, error: 'no_clickable' });
            return null;
          }
          // Tip: digSelectionProcess* inside evaluate can hang the CDP session forever.
          // Only native click here; Node-side timeout wraps this evaluate.
          try {
            hit.node.click();
            attempts.push({ label, ok: true, text: hit.t.slice(0, 80), dataId: hit.dataId });
            return { text: hit.t.slice(0, 80), dataId: hit.dataId };
          } catch (err) {
            attempts.push({ label, ok: false, error: String(err?.message || err).slice(0, 120) });
            return null;
          }
        };

        // Birth money path: delivery/global first — never prefer 59080 labor-day alone.
        let procedure = pickFromSelect(
          'SearchService',
          'SearchService',
          /59409|59400|59410|59431|delivery only|global midwifery|vaginal birth|vaginal delivery/i,
          /59080|initial day labor/i
        );
        await new Promise((r) => setTimeout(r, 600));
        // Do NOT click procedure/diagnosis list rows here — tip proved digSelection/native click can wedge CDP.
        // Rely on SearchService/DignosticService change + updateBilling* + Daily Super Bill.
        clickAddNear('SearchService', 'add_procedure');
        callHelpers([
          'addBillingService',
          'AddBillingService',
          'addServiceToChargeSlip',
          'serviceSelectionProcess',
          'updateBillingServiceRecord',
        ], 'proc_helper');
        let diagnosis = pickFromSelect(
          'DignosticService',
          'DignosticService',
          /^O80|^Z37|^Z39|single live birth|encounter for full-term|outcome of delivery|normal delivery/i
        );
        await new Promise((r) => setTimeout(r, 600));
        clickAddNear('DignosticService', 'add_diagnosis');
        callHelpers([
          'addBillingDiagnosis',
          'AddBillingDiagnosis',
          'diagnosisSelectionProcess',
          'updateBillingDiagonsticCodeRecord',
          'updateBillingDiagnosticCodeRecord',
        ], 'dx_helper');
        await new Promise((r) => setTimeout(r, 800));

        const fillNearby = (needle, value) => {
          const labels = Array.from(document.querySelectorAll('label, span, td, th, div'));
          for (const lab of labels) {
            const t = (lab.textContent || '').trim();
            if (!new RegExp(`^${needle}$`, 'i').test(t) && !new RegExp(`^${needle}\\s*:$`, 'i').test(t)) continue;
            const root = lab.closest('tr, .form-group, .row, td, div') || lab.parentElement;
            const input = root?.querySelector('input, select');
            if (!input || isDateMaskInput(input)) continue;
            if (input.tagName === 'SELECT') {
              const opt = Array.from(input.options || []).find((o) => String(o.value) === String(value) || (o.textContent || '').includes(String(value)))
                || Array.from(input.options || []).find((o) => new RegExp(`\\b${value}\\b|home|other`, 'i').test(`${o.value} ${o.textContent || ''}`));
              if (!opt) continue;
              input.value = opt.value;
            } else {
              input.value = String(value);
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            try { window.$(input).trigger('change'); } catch (_) { /* ignore */ }
            attempts.push({ label: `fill_${needle}`, ok: true, value: String(input.value).slice(0, 40) });
            return true;
          }
          attempts.push({ label: `fill_${needle}`, ok: false, error: 'no_safe_input' });
          return false;
        };
        fillNearby('Units', '1');
        fillNearby('POS', '12');
        // Fill blank Mod/POS/Units cells inside the charge slip summary grid (tip showed empty).
        const summaryRoot = document.getElementById('ChargeSlipSummaryBase');
        if (summaryRoot) {
          const inputs = Array.from(summaryRoot.querySelectorAll('input, select'));
          for (const input of inputs) {
            if (isDateMaskInput(input)) continue;
            const ctx = `${input.id || ''} ${input.name || ''} ${input.className || ''} ${(input.closest('td, th, div, label')?.textContent || '')}`.slice(0, 120);
            let val = null;
            if (/unit/i.test(ctx)) val = '1';
            else if (/pos|place.?of.?service/i.test(ctx)) val = '12';
            if (!val) continue;
            if (input.tagName === 'SELECT') {
              const opt = Array.from(input.options || []).find((o) => String(o.value) === val || new RegExp(`\\b${val}\\b`).test(o.textContent || ''));
              if (!opt) continue;
              input.value = opt.value;
            } else {
              input.value = val;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            try { window.$(input).trigger('change'); } catch (_) { /* ignore */ }
            attempts.push({ label: 'summary_fill', ok: true, ctx: ctx.slice(0, 40), value: val });
          }
        }
        for (const [id, val] of [['Units', '1'], ['Unit', '1'], ['PlaceOfServiceCode', '12'], ['POS', '12'], ['PlaceOfService', '12']]) {
          const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
          if (!el || isDateMaskInput(el)) continue;
          el.value = val;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          attempts.push({ label: `field_${id}`, ok: true, value: val });
        }
        try {
          if (typeof window.updateBillingServiceRecord === 'function') window.updateBillingServiceRecord();
          if (typeof window.updateBillingSlipSummaryRecord === 'function') window.updateBillingSlipSummaryRecord();
          attempts.push({ label: 'update_billing_records', ok: true });
        } catch (err) {
          attempts.push({ label: 'update_billing_records', ok: false, error: String(err?.message || err).slice(0, 100) });
        }
        await new Promise((r) => setTimeout(r, 800));
        const summary = (document.getElementById('ChargeSlipSummaryBase')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300);
        const lineRows = Array.from(document.querySelectorAll('#ChargeSlipSummaryBase tr, .billing-service-row, [data-billing-service], #service-grid tr'))
          .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100))
          .filter((t) => t && /594|590|O80|Z37|CPT|unit/i.test(t))
          .slice(0, 8);
        const helperNames = Object.getOwnPropertyNames(window)
          .filter((n) => /^(add|save|update|create|change|select|refresh|dig)/i.test(n) && /billing|charge|slip|service|diagnos|Selection/i.test(n) && typeof window[n] === 'function')
          .slice(0, 40);
        const fullNameText = (document.getElementById('FullNameText')?.textContent || '').trim().slice(0, 80);
        return {
          procedure,
          diagnosis,
          attempts,
          summary,
          lineRows,
          helperNames,
          fullNameText,
          patientStillBound: Boolean(fullNameText && !/please select/i.test(fullNameText)),
        };
      }, undefined, 60000);
      } catch (err) {
        codesSelected = {
          procedure: null,
          diagnosis: null,
          attempts: [{ label: 'codes_evaluate', ok: false, error: String(err?.message || err).slice(0, 160) }],
          error: String(err?.message || err).slice(0, 200),
        };
      }
      await sleep(800);

      // If code selection wiped patient context, re-bind visit row before Save.
      if (codesSelected && codesSelected.patientStillBound === false && visitList?.match?.pregnancyId) {
        const rebind = await session.page.evaluate((wantId) => {
          const rows = Array.from(document.querySelectorAll('tr, li, a, div'));
          const row = rows.find((el) => {
            const onclick = el.getAttribute('onclick') || '';
            const text = (el.innerText || '').replace(/\s+/g, ' ');
            return (wantId && (onclick.includes(wantId) || text.toLowerCase().includes(String(wantId).slice(0, 8).toLowerCase())))
              || (typeof window.selectClick === 'function' && /selectClick\(this\)/i.test(onclick));
          });
          if (!row) return { ok: false };
          try {
            if (typeof window.selectClick === 'function') window.selectClick(row);
            else row.click();
            return { ok: true, name: (document.getElementById('FullNameText')?.textContent || '').trim().slice(0, 80) };
          } catch (err) {
            return { ok: false, error: String(err?.message || err).slice(0, 120) };
          }
        }, visitList.match.pregnancyId);
        codesSelected.rebindBeforeSave = rebind;
        await sleep(1200);
      }

      // Daily Super Bill → SuperBillReport (tip: openReportItems → /Billing/SuperBillReport?FromDate=).
      // Prefer same-tab navigate — popup CDP (browser.pages) wedged tip mid-run.
      let dailySuperBill = { clicked: false };
      const reportDate = matchedDate || visitDate || null;
      dailySuperBill = await session.page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, input[type="button"], a, span'))
          .find((el) => /daily super bill/i.test((el.textContent || el.value || '').trim()));
        if (!btn) return { clicked: false, present: false };
        return {
          clicked: false,
          present: true,
          text: (btn.textContent || btn.value || '').trim().slice(0, 40),
          onclick: (btn.getAttribute?.('onclick') || '').slice(0, 200),
          deferred: true,
        };
      });
      if (reportDate) {
        const reportUrl = `${origin}/Billing/SuperBillReport?FromDate=${encodeURIComponent(reportDate)}`;
        const reportNav = await gotoWithBudget(session.page, reportUrl, {
          timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
        });
        dailySuperBill.reportNav = { ok: reportNav.ok, url: reportUrl, error: reportNav.error || null };
        if (reportNav.ok) {
          dailySuperBill.clicked = true;
          dailySuperBill.path = 'direct_SuperBillReport';
          await sleep(2000);
          for (let w = 0; w < 8; w += 1) {
            const loading = await session.page.evaluate(() => /Loading\s*\.{0,3}/i.test(document.body?.innerText || ''));
            if (!loading) break;
            await sleep(750);
          }
          const inventory = await session.page.evaluate(() => {
            const visible = (el) => {
              if (!el) return false;
              const s = window.getComputedStyle(el);
              if (s.display === 'none' || s.visibility === 'hidden') return false;
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            };
            const navNoise = /home|clients|schedule|reports|sign out|create new client|english|spanish|help center|terms|privacy|my profile/i;
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
              .filter(visible)
              .map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
              .filter((t) => t && t.length < 60 && !navNoise.test(t))
              .slice(0, 40);
            const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
              .filter(visible)
              .map((el) => ({
                id: el.id || null,
                name: el.name || null,
                type: el.type || null,
                value: String(el.value || '').slice(0, 40),
              }))
              .slice(0, 30);
            const helpers = Object.getOwnPropertyNames(window)
              .filter((n) => /super|claim|bill|create|generate|filter|report/i.test(n) && typeof window[n] === 'function')
              .slice(0, 40);
            const rows = Array.from(document.querySelectorAll('table tr, .k-grid-content tr, .k-master-row'))
              .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())
              .filter((t) => t && t.length < 220)
              .slice(0, 20);
            return {
              url: location.href,
              title: document.title || null,
              buttons,
              inputs,
              helpers,
              rows,
              preview: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 900),
            };
          });
          dailySuperBill.inventory = inventory;

          let interact = { attempts: [], error: 'not_run' };
          const wantPatientNeedle = String(visitList?.match?.name || patientQuery || 'Alvarado')
            .toLowerCase()
            .split(/[\s,]+/)
            .find((p) => p.length > 3) || 'alvarado';
          // Tip 2026-07-14: Denise SuperBill already shows 59400 + "Invoice HCFA UB-04" text, but
          // scoped TR query missed the real <a> nodes (often in sibling detail rows / after Filter paint).
          // Click finder must (1) walk patient header + following rows, (2) allow href/onclick matches
          // even when getBoundingClientRect is 0, (3) Filter then sleep then re-click (sync retry is empty).
          const clickSuperBillClaimLink = async (phase) => evaluateWithTimeout(session.page, ({ wantName, phase: runPhase }) => {
            const attempts = [];
            const softVisible = (el) => {
              if (!el) return false;
              const s = window.getComputedStyle(el);
              if (s.display === 'none' || s.visibility === 'hidden') return false;
              return true;
            };
            const hardVisible = (el) => {
              if (!softVisible(el)) return false;
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            };
            const nameRe = new RegExp(String(wantName || 'alvarado').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const allRows = Array.from(document.querySelectorAll('table tr, .k-grid-content tr, .k-master-row, .k-detail-row'));
            const patientRows = allRows.filter((tr) => nameRe.test((tr.innerText || '').replace(/\s+/g, ' ')));
            const scopeRoots = [];
            for (const header of patientRows) {
              scopeRoots.push(header);
              let sib = header.nextElementSibling;
              for (let i = 0; i < 12 && sib; i += 1) {
                const t = (sib.innerText || '').replace(/\s+/g, ' ').trim();
                // Stop at next patient header (name + Primary/Insurance pattern), keep procedure/claim rows.
                if (/primary\s*:/i.test(t) && nameRe.test(t) === false && /[A-Za-z]{3,}/.test(t.split(/primary/i)[0] || '')) break;
                if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(t) && !/5940|invoice|hcfa|ub-?04|global midwifery|generated by/i.test(t) && !nameRe.test(t)) break;
                scopeRoots.push(sib);
                sib = sib.nextElementSibling;
              }
            }
            if (!scopeRoots.length) scopeRoots.push(document.body);
            const scoreClaimEl = (el) => {
              const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
              const ownText = Array.from(el.childNodes || [])
                .filter((n) => n.nodeType === 3)
                .map((n) => String(n.textContent || '').trim())
                .filter(Boolean)
                .join(' ');
              const href = `${el.getAttribute?.('href') || ''} ${el.getAttribute?.('onclick') || ''} ${el.getAttribute?.('data-url') || ''}`;
              let score = 0;
              if (/^(invoice|hcfa|ub-?04)$/i.test(ownText || t)) score += 100;
              else if (/^(invoice|hcfa|ub-?04)$/i.test(t) && t.length < 24) score += 95;
              else if (el.children?.length === 0 && /^(invoice|hcfa|ub-?04)$/i.test(t)) score += 90;
              else if (/invoicehcfa|hcfaedit|invoice.*hcfa|\/hcfa|createclaim|superbill|billing\/invoice|billing\/hcfa/i.test(href)) score += 85;
              else if (/^(invoice|hcfa|ub-?04)\b/i.test(t) && t.length < 40) score += 70;
              else if (/\b(invoice|hcfa|ub-?04)\b/i.test(t) && t.length < 48) score += 40;
              if (/create new client|home|clients|schedule/i.test(t)) score -= 200;
              return score;
            };
            const claimCandidates = [];
            const selectors = 'a, button, input[type="button"], input[type="submit"], span, td, [onclick], [role="link"]';
            const pushFromRoot = (root, scoped) => {
              for (const el of Array.from(root.querySelectorAll(selectors)).filter(softVisible)) {
                const score = scoreClaimEl(el);
                if (score < 40) continue;
                claimCandidates.push({
                  el,
                  score: score + (hardVisible(el) ? 5 : 0) + (scoped ? 10 : 0),
                  text: (el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
                  href: (el.getAttribute?.('href') || '').slice(0, 160),
                  onclick: (el.getAttribute?.('onclick') || '').slice(0, 160),
                  scoped,
                });
              }
            };
            for (const root of scopeRoots) pushFromRoot(root, true);
            // Fallback: global exact Invoice/HCFA anchors whose closest row is near patient name.
            if (!claimCandidates.length) {
              for (const el of Array.from(document.querySelectorAll('a, button')).filter(softVisible)) {
                const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
                if (!/^(invoice|hcfa|ub-?04)$/i.test(t)) continue;
                const tr = el.closest('tr');
                let near = false;
                let cur = tr;
                for (let i = 0; i < 10 && cur; i += 1) {
                  if (nameRe.test((cur.innerText || '').replace(/\s+/g, ' '))) { near = true; break; }
                  cur = cur.previousElementSibling;
                }
                if (!near) continue;
                claimCandidates.push({
                  el,
                  score: /^hcfa$/i.test(t) ? 110 : 100,
                  text: t.slice(0, 40),
                  href: (el.getAttribute?.('href') || '').slice(0, 160),
                  onclick: (el.getAttribute?.('onclick') || '').slice(0, 160),
                  scoped: true,
                  near_patient_walk: true,
                });
              }
            }
            claimCandidates.sort((a, b) => b.score - a.score);
            if (claimCandidates.length) {
              const prefer = claimCandidates.find((c) => /^hcfa$/i.test(c.text))
                || claimCandidates.find((c) => /hcfa/i.test(c.text) || /hcfa/i.test(c.href + c.onclick))
                || claimCandidates.find((c) => /^invoice$/i.test(c.text))
                || claimCandidates[0];
              prefer.el.click();
              attempts.push({
                label: 'claim_link',
                ok: true,
                phase: runPhase,
                text: prefer.text,
                score: prefer.score,
                href: prefer.href || null,
                count: claimCandidates.length,
                scoped_to_patient: patientRows.length > 0,
                want_name: String(wantName || '').slice(0, 40),
                top: claimCandidates.slice(0, 5).map((c) => ({ text: c.text, score: c.score, href: c.href || null })),
              });
            } else {
              attempts.push({
                label: 'claim_link',
                ok: false,
                phase: runPhase,
                error: 'no_claim_link_in_scope',
                scoped_to_patient: patientRows.length > 0,
                scope_row_count: scopeRoots.length,
                patient_row_preview: patientRows[0]
                  ? (patientRows[0].innerText || '').replace(/\s+/g, ' ').trim().slice(0, 180)
                  : null,
                global_claim_texts: Array.from(document.querySelectorAll('a, button'))
                  .map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
                  .filter((t) => /^(invoice|hcfa|ub-?04)$/i.test(t))
                  .slice(0, 8),
              });
            }
            return {
              attempts,
              url: location.href,
              preview: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700),
              deniseRow: (document.body.innerText || '').match(/Denise[^.]{0,120}/i)?.[0] || null,
              patientRowCount: patientRows.length,
              scopeRowCount: scopeRoots.length,
            };
          }, { wantName: wantPatientNeedle, phase }, 45000);

          try {
            interact = await clickSuperBillClaimLink('initial');
            const claimOk = Array.isArray(interact?.attempts)
              && interact.attempts.some((a) => a.label === 'claim_link' && a.ok);
            if (!claimOk) {
              // Filter/Search can materialize Invoice/HCFA cells — tip proved links appear after Filter + paint.
              const filterPass = await evaluateWithTimeout(session.page, ({ wantDate }) => {
                const attempts = [];
                const visible = (el) => {
                  if (!el) return false;
                  const s = window.getComputedStyle(el);
                  if (s.display === 'none' || s.visibility === 'hidden') return false;
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0;
                };
                const navNoise = /^(home|clients|schedule|reports|wrm|cora|help|sign out|english|spanish|french|italian|german|portuguese|russian|dutch|ukrainian|text messages|back|send|terms|privacy|front desk|new note|create new client|view client list|manage account|practice management|employee log|my profile|billing slip|record insurance|review sent|review all faxes)$/i;
                if (wantDate) {
                  for (const el of Array.from(document.querySelectorAll('input')).filter(visible)) {
                    if (/radio|checkbox|hidden|submit|button/i.test(el.type || '')) continue;
                    const ctx = `${el.id || ''} ${el.name || ''} ${el.placeholder || ''} ${el.className || ''}`;
                    if (/lmp|dob|birth|born|rdo|sms|message|filtertext/i.test(ctx)) continue;
                    if (!/date|from|to|dos|service|visit|bill/i.test(ctx)) continue;
                    el.focus();
                    el.value = String(wantDate);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    try { window.$(el).trigger('change'); } catch (_) { /* ignore */ }
                    attempts.push({ label: 'fill_date', ok: true, id: el.id || el.name || null, value: String(wantDate) });
                    break;
                  }
                }
                const ranked = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
                  .filter(visible)
                  .map((el) => {
                    const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
                    let score = 0;
                    if (/create\s*claim|generate\s*claim|create\s*super|post\s*claim|build\s*claim/i.test(t)) score += 100;
                    if (/^(invoice|hcfa|ub-?04)$/i.test(t)) score += 90;
                    if (/filter|search|apply|run\s*report|refresh|load/i.test(t)) score += 40;
                    if (navNoise.test(t) || /create new client/i.test(t)) score -= 200;
                    return { el, t, score };
                  })
                  .filter((x) => x.t && x.score > 0)
                  .sort((a, b) => b.score - a.score);
                if (ranked[0]) {
                  ranked[0].el.click();
                  attempts.push({ label: 'click_action', ok: true, text: ranked[0].t.slice(0, 40), score: ranked[0].score });
                } else {
                  attempts.push({ label: 'click_action', ok: false, error: 'no_report_action' });
                }
                const checks = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(visible);
                let checked = 0;
                for (const c of checks.slice(0, 25)) {
                  if (!c.checked) { c.click(); checked += 1; }
                }
                if (checks.length) attempts.push({ label: 'checkboxes', ok: true, total: checks.length, checked });
                return { attempts };
              }, { wantDate: reportDate }, 30000);
              interact.attempts = [...(interact.attempts || []), ...(filterPass?.attempts || [])];
              await sleep(3500);
              const retry = await clickSuperBillClaimLink('after_filter');
              interact.attempts = [...(interact.attempts || []), ...(retry?.attempts || [])];
              interact.url = retry?.url || interact.url;
              interact.preview = retry?.preview || interact.preview;
              interact.deniseRow = retry?.deniseRow || interact.deniseRow;
              interact.patientRowCount = retry?.patientRowCount ?? interact.patientRowCount;
              interact.scopeRowCount = retry?.scopeRowCount ?? interact.scopeRowCount;
            }
          } catch (err) {
            interact = { attempts: [], error: String(err?.message || err).slice(0, 160) };
          }
          dailySuperBill.interact = interact;
          await sleep(2500);

          // After Invoice/HCFA click: drive the claim editor Save/Submit (tip: bare click left Sent Bills empty).
          const claimLinkOk = Array.isArray(interact?.attempts)
            && interact.attempts.some((a) => a.label === 'claim_link' && a.ok);
          if (claimLinkOk) {
            try {
              dailySuperBill.claimEditor = await evaluateWithTimeout(session.page, () => {
                const visible = (el) => {
                  if (!el) return false;
                  const s = window.getComputedStyle(el);
                  if (s.display === 'none' || s.visibility === 'hidden') return false;
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0;
                };
                const url = location.href;
                const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
                const isEditor = /Invoice|HCFA|UB.?04|SuperBill|ClaimEdit|CreateClaim/i.test(url)
                  || /hcfa|invoice|super bill|create claim/i.test(document.title || '')
                  || /save\s*claim|submit\s*claim|print\s*hcfa|electronic\s*submit/i.test(text);
                const attempts = [];
                if (!isEditor && !/Invoice|HCFA|Billing/i.test(url)) {
                  return { isEditor: false, url, preview: text.slice(0, 400), attempts };
                }
                const ranked = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
                  .filter(visible)
                  .map((el) => {
                    const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
                    let score = 0;
                    if (/^save$/i.test(t) || /save\s*(claim|bill|hcfa|invoice)/i.test(t)) score += 100;
                    if (/submit|send\s*claim|create\s*claim|file\s*claim|post\s*claim/i.test(t)) score += 90;
                    if (/generate|print\s*and\s*save|electronic/i.test(t)) score += 50;
                    if (/cancel|close|back|delete|home|clients/i.test(t)) score -= 200;
                    return { el, t, score };
                  })
                  .filter((x) => x.t && x.score > 0)
                  .sort((a, b) => b.score - a.score);
                if (ranked[0]) {
                  ranked[0].el.click();
                  attempts.push({ label: 'editor_save', ok: true, text: ranked[0].t.slice(0, 40), score: ranked[0].score });
                } else {
                  attempts.push({ label: 'editor_save', ok: false, error: 'no_save_button' });
                }
                for (const name of ['SaveClaim', 'saveClaim', 'SubmitClaim', 'submitClaim', 'CreateClaim', 'createClaim']) {
                  if (typeof window[name] !== 'function') continue;
                  try {
                    window[name]();
                    attempts.push({ label: `helper:${name}`, ok: true });
                    break;
                  } catch (err) {
                    attempts.push({ label: `helper:${name}`, ok: false, error: String(err?.message || err).slice(0, 100) });
                  }
                }
                return {
                  isEditor: true,
                  url,
                  title: document.title || null,
                  attempts,
                  preview: text.slice(0, 500),
                };
              }, undefined, 30000);
              await sleep(3500);
            } catch (err) {
              dailySuperBill.claimEditor = { error: String(err?.message || err).slice(0, 160) };
            }
          }

          dailySuperBill.afterReport = await session.page.evaluate(() => ({
            url: location.href,
            preview: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700),
            rows: Array.from(document.querySelectorAll('table tr, .k-grid-content tr'))
              .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())
              .filter((t) => /59400|59409|claim|alvarado|denise|\$\d|invoice|hcfa/i.test(t))
              .slice(0, 12),
            claimLinks: Array.from(document.querySelectorAll('a, button'))
              .map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
              .filter((t) => /^(invoice|hcfa|ub-?04)$/i.test(t))
              .slice(0, 10),
          }));

          // Prove claim create from report without needing ChargeSlip Save.
          try {
            const billsNav = await gotoWithBudget(session.page, `${origin}/Billing/BillingListView`, {
              timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
            });
            if (billsNav.ok) {
              await sleep(2000);
              dailySuperBill.sentBillsProbe = await session.page.evaluate((wantName) => {
                const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
                const needle = String(wantName || '').toLowerCase().split(/\s+/).find((p) => p.length > 3) || '';
                return {
                  checked: true,
                  noItems: /no items to display|no records|no data/i.test(text),
                  nameHit: Boolean(needle && text.toLowerCase().includes(needle)),
                  preview: text.slice(0, 400),
                };
              }, visitList?.match?.name || patientQuery || 'Alvarado');
            } else {
              dailySuperBill.sentBillsProbe = { checked: false, error: billsNav.error };
            }
          } catch (err) {
            dailySuperBill.sentBillsProbe = { checked: false, error: String(err?.message || err).slice(0, 120) };
          }
        }

        // Return to ChargeSlip and rebind patient for Save / persist proof.
        const backQs = pregnancyId ? `?pregnancyId=${encodeURIComponent(pregnancyId)}` : '';
        const backNav = await gotoWithBudget(session.page, `${origin}/Company/ChargeSlip${backQs}`, {
          timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
        });
        dailySuperBill.backToChargeSlip = { ok: backNav.ok, error: backNav.error || null };
        if (backNav.ok) {
          await sleep(1500);
          await dismissSessionTakeover(session.page);
          if (reportDate) {
            await session.page.evaluate((rawDate) => {
              const input = document.querySelector('input[name="DateFilter"]')
                || Array.from(document.querySelectorAll('input')).find((el) => /date/i.test(`${el.id} ${el.name} ${el.placeholder || ''}`));
              if (!input) return;
              input.value = String(rawDate);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }, reportDate);
            await sleep(500);
          }
          // Re-fetch visit list and selectClick DOM row (same binder as initial map).
          if (visitList?.match?.pregnancyId) {
            const rebind = await session.page.evaluate(async ({ providerId, dateSelection, wantPregnancyId }) => {
              const pid = providerId || '00000000-0000-0000-0000-000000000000';
              const date = dateSelection || '';
              try {
                const url = `/Company/SearchBillingSlipPregnancyList?PrividerId=${encodeURIComponent(pid)}&DateSelection=${encodeURIComponent(date)}&_=${Date.now()}`;
                const res = await fetch(url, { credentials: 'same-origin' });
                const data = await res.json();
                const rows = Array.isArray(data) ? data : (data?.Data || data?.data || []);
                const match = (rows || []).find((r) => String(r.PregnancyID || r.PregnancyId || '').toLowerCase() === String(wantPregnancyId).toLowerCase());
                const rowEl = Array.from(document.querySelectorAll('tr, li, a, div')).find((el) => {
                  const onclick = el.getAttribute('onclick') || '';
                  return wantPregnancyId && onclick.includes(wantPregnancyId);
                }) || Array.from(document.querySelectorAll('[onclick*="selectClick"]')).find((el) => /selectClick\(this\)/i.test(el.getAttribute('onclick') || ''));
                if (rowEl && typeof window.selectClick === 'function') {
                  window.selectClick(rowEl);
                } else if (match && typeof window.selectClick === 'function') {
                  // Last resort: click any selectClick(this) row whose text mentions the name.
                  const name = String(match.FullName || '').split(',')[0].trim();
                  const byName = Array.from(document.querySelectorAll('[onclick*="selectClick"]')).find((el) => (el.innerText || '').includes(name));
                  if (byName) window.selectClick(byName);
                  else return { ok: false, error: 'no_dom_row', matchName: name || null };
                } else {
                  return { ok: false, error: 'no_row_or_selectClick', hasMatch: Boolean(match) };
                }
                await new Promise((r) => setTimeout(r, 800));
                const name = (document.getElementById('FullNameText')?.textContent || '').trim();
                return {
                  ok: Boolean(name && !/please select/i.test(name)),
                  name: name.slice(0, 80),
                  matchName: match?.FullName || null,
                };
              } catch (err) {
                return { ok: false, error: String(err?.message || err).slice(0, 120) };
              }
            }, {
              providerId: providerSet?.value || null,
              dateSelection: reportDate,
              wantPregnancyId: visitList.match.pregnancyId,
            });
            dailySuperBill.rebindAfter = rebind;
            await sleep(800);
          }
        }
      }

      const map = await session.page.evaluate((wantName) => {
        const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
        const fullNameText = (document.getElementById('FullNameText')?.textContent || '').trim();
        const patientLine = fullNameText
          || (text.match(/Patient:\s*([^A]{0,80}?)\s*Age:/i) || text.match(/Patient:\s*(.{0,80})/i) || [])[1]
          || '';
        const dobLine = (document.getElementById('DOBText')?.textContent || '').trim()
          || (text.match(/DOB:\s*([^\s]{0,40})/i) || [])[1]
          || '';
        const ageLine = (document.getElementById('AgeText')?.textContent || '').trim()
          || (text.match(/Age:\s*([^\s]{0,20})/i) || [])[1]
          || '';
        const needle = String(wantName || '').trim().toLowerCase().split(/\s+/).find((p) => p.length > 2);
        const nameOk = !needle || patientLine.toLowerCase().includes(needle);
        const patientSelected = Boolean(
          nameOk
          && (
            (patientLine && !/please select/i.test(patientLine) && /[A-Za-z]{2,}/.test(patientLine))
            || (dobLine && /\d/.test(dobLine))
            || (ageLine && /\d/.test(ageLine))
          )
        );
        const chargeOpts = Array.from(document.getElementById('ChargeSlipId')?.options || [])
          .map((o) => (o.textContent || '').trim())
          .filter(Boolean);
        return {
          patientSelected,
          patientLine: patientLine.slice(0, 80),
          fullNameText: fullNameText.slice(0, 80),
          ageLine: ageLine.slice(0, 40),
          dobLine: dobLine.slice(0, 40),
          chargeOpts,
          textPreview: text.slice(0, 1200),
        };
      }, visitList?.match?.name || patientQuery);

      const boundOk = Boolean(visitList?.match?.pregnancyId)
        && (!pregnancyId || String(visitList.match.pregnancyId).toLowerCase() === String(pregnancyId).toLowerCase())
        && (map.patientSelected || visitList?.rebind?.patientSelected);

      let saveResult = { attempted: false };
      let persistCheck = null;
      if (!dryRun) {
        const preSavePatient = await session.page.evaluate(() => {
          const fullNameText = (document.getElementById('FullNameText')?.textContent || '').trim();
          return {
            fullNameText: fullNameText.slice(0, 80),
            ok: Boolean(fullNameText && !/please select/i.test(fullNameText) && /[A-Za-z]{2,}/.test(fullNameText)),
          };
        });
        if (!boundOk || !preSavePatient.ok) {
          saveResult = {
            attempted: false,
            blocked: true,
            reason: 'fail_closed_patient_missing_before_save',
            preSavePatient,
          };
        } else if (!codesSelected?.procedure && !codesSelected?.diagnosis && !dailySuperBill?.clicked) {
          saveResult = { attempted: false, blocked: true, reason: 'no_procedure_or_diagnosis_selected' };
        } else {
          saveResult = await session.page.evaluate(() => {
            const helpers = [
              'saveChargeSlip',
              'SaveChargeSlip',
              'saveBillingSlip',
              'SaveBillingSlip',
              'saveBillingSlipSummaryRecord',
              'createBillingSlip',
              'CreateBillingSlip',
            ].filter((name) => typeof window[name] === 'function');
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
            const save = buttons.find((el) => /^save$/i.test((el.textContent || el.value || '').trim()))
              || buttons.find((el) => /save\s*(slip|bill|charge)/i.test((el.textContent || el.value || '').trim()));
            const dialogs = [];
            const prevAlert = window.alert;
            const prevConfirm = window.confirm;
            window.alert = (msg) => { dialogs.push({ type: 'alert', msg: String(msg || '').slice(0, 200) }); };
            window.confirm = (msg) => { dialogs.push({ type: 'confirm', msg: String(msg || '').slice(0, 200) }); return true; };
            let helperUsed = null;
            try {
              if (helpers.includes('saveBillingSlipSummaryRecord')) {
                window.saveBillingSlipSummaryRecord();
                helperUsed = 'saveBillingSlipSummaryRecord';
              } else if (helpers[0]) {
                window[helpers[0]]();
                helperUsed = helpers[0];
              } else if (save) {
                save.click();
                helperUsed = 'button:' + (save.textContent || save.value || 'Save').trim();
              } else {
                return { attempted: false, helpers };
              }
            } finally {
              window.alert = prevAlert;
              window.confirm = prevConfirm;
            }
            const chargeVal = document.getElementById('ChargeSlipId')?.value || null;
            const validation = (document.querySelector('.validation-summary-errors, .field-validation-error, .alert-danger, #ErrorMessage, .error')?.innerText || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 240);
            return {
              attempted: true,
              label: helperUsed,
              helpers,
              dialogs,
              chargeSlipValue: chargeVal,
              validation: validation || null,
            };
          });
          await sleep(3500);
          persistCheck = await session.page.evaluate(() => {
            const chargeSel = document.getElementById('ChargeSlipId');
            const chargeVal = chargeSel?.value || '';
            const chargeText = (chargeSel?.selectedOptions?.[0]?.textContent || '').trim();
            const summary = (document.getElementById('ChargeSlipSummaryBase')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300);
            const body = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
            const errorBits = (body.match(/(please select|required|error[^\.]{0,80}|cannot save[^\.]{0,80})/ig) || []).slice(0, 5);
            const lineHints = Array.from(document.querySelectorAll('#ChargeSlipSummaryBase tr, .billing-service-row, [data-billing-service]'))
              .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())
              .filter((t) => /59400|59409|59080|O80|Z37|\$\d/.test(t))
              .slice(0, 8);
            // ChargeSlipId is the CARE TYPE select (Intrapartum GUID) — not a durable slip id.
            const careTypeOnly = /intrapartum|antepartum|postpartum|care/i.test(chargeText);
            return {
              chargeSlipValue: chargeVal,
              chargeSlipText: chargeText.slice(0, 80),
              careTypeOnly,
              nonZeroChargeSlip: Boolean(chargeVal && chargeVal !== '00000000-0000-0000-0000-000000000000'),
              lineHints,
              summary,
              errorBits,
              url: location.href,
            };
          });
          // Prove persist via Review Sent Bills AND patient billing chart (Sent Bills may only show filed claims).
          let sentBills = { checked: false };
          let chartCharges = { checked: false };
          try {
            const billsNav = await gotoWithBudget(session.page, `${origin}/Billing/BillingListView`, {
              timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
            });
            if (billsNav.ok) {
              await sleep(2000);
              sentBills = await session.page.evaluate((wantName) => {
                const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
                const needle = String(wantName || '').toLowerCase().split(/\s+/).find((p) => p.length > 3) || '';
                const noItems = /no items to display|no records|no data/i.test(text);
                const hit = needle && text.toLowerCase().includes(needle);
                const rows = Array.from(document.querySelectorAll('table tr, .k-grid-content tr'))
                  .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())
                  .filter((t) => t && needle && t.toLowerCase().includes(needle))
                  .slice(0, 5);
                return {
                  checked: true,
                  noItems,
                  nameHit: Boolean(hit),
                  rows,
                  preview: text.slice(0, 400),
                };
              }, visitList?.match?.name || patientQuery || 'Alvarado');
            } else {
              sentBills = { checked: false, error: billsNav.error };
            }
          } catch (err) {
            sentBills = { checked: false, error: String(err?.message || err).slice(0, 120) };
          }
          if (pregnancyId) {
            try {
              const chartNav = await gotoWithBudget(session.page, `${origin}/Pregnancy/Billing/${encodeURIComponent(pregnancyId)}`, {
                timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
              });
              if (chartNav.ok) {
                await sleep(1500);
                await dismissSessionTakeover(session.page);
                await session.page.evaluate(() => {
                  const tab = document.querySelector('a[href*="#tabs-billing"], a[href*="tabs-billing"], [data-toggle="tab"][href*="billing"]');
                  if (tab) tab.click();
                });
                await sleep(2000);
                chartCharges = await session.page.evaluate(() => {
                  const text = (document.body.innerText || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ').replace(/\s+/g, ' ').trim();
                  const has594 = /59400|59409|59080/i.test(text);
                  const hasO80 = /\bO80\b/i.test(text);
                  const chargeHints = (text.match(/.{0,40}(59400|59409|59080|charge slip|billed|\$\d[\d,]*)\.{0,40}/gi) || []).slice(0, 8);
                  return {
                    checked: true,
                    has594,
                    hasO80,
                    chargeHints,
                    preview: text.slice(0, 500),
                  };
                });
              } else {
                chartCharges = { checked: false, error: chartNav.error };
              }
            } catch (err) {
              chartCharges = { checked: false, error: String(err?.message || err).slice(0, 120) };
            }
          }
          persistCheck = { ...persistCheck, sentBills, chartCharges };
          saveResult = { ...saveResult, persistCheck };
        }
      }

      return {
        ok: true,
        url: target,
        pregnancyId: pregnancyId || null,
        patientQuery: patientQuery || null,
        bornDate,
        matchedDate,
        dateCandidatesTried: dateCandidates.slice(0, 40),
        dryRun: dryRun !== false,
        dateSet: { ...dateSet, matchedDate },
        providerSet,
        visitList,
        visitClick,
        chargeSlipType,
        codesMap,
        codesSelected,
        dailySuperBill,
        typed,
        hiddenForce,
        saveResult,
        persistCheck,
        boundOk,
        ...map,
        patientSelected: boundOk,
        screenshots,
        next: boundOk
          ? (codesSelected?.procedure || codesSelected?.diagnosis || dailySuperBill?.clicked
            ? (dryRun !== false
              ? 'Patient + codes ready — re-run dry_run=false to Save.'
              : (persistCheck?.sentBills?.nameHit || persistCheck?.chartCharges?.has594
                ? 'PROVED: charge evidence on Sent Bills and/or patient billing chart after Save — continue HCFA/submit.'
                : (persistCheck?.sentBills?.noItems && !persistCheck?.chartCharges?.has594
                  ? 'Save ran but Sent Bills empty and billing chart shows no 594xx — line apply still incomplete.'
                  : (saveResult.attempted
                    ? 'Save attempted — inspect persistCheck.sentBills + chartCharges + lineHints.'
                    : (saveResult.blocked || 'Save blocked/missing.')))))
            : 'Patient bound but no procedure/diagnosis hydrated — inspect codesMap; may need fee-schedule seeding.')
          : (visitList?.match?.pregnancyId
            ? 'Visit row found but ChargeSlip #FullNameText still empty — call selectClick(rowEl) only (not API raw).'
            : 'Fail-closed: pregnancy not found on scanned visit dates — widen visit_dates or confirm chart Born date.'),
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  /**
   * Short path: SuperBillReport → HCFA/Invoice → claim-editor Save → Sent Bills probe.
   * Tip: full mapChargeSlip often goes stale (~360s) under Puppeteer recycle; Denise already
   * had 59400 lines on SuperBillReport — this files without redoing ChargeSlip.
   * Tip 2026-07-15: SuperBill→goto InvoiceHCFAEdit wedges CDP; when pregnancyId known, go
   * straight to /Billing/InvoiceHCFAEdit?pregnancyID=… then Save + Send via EDI.
   */
  async function fileSuperBillClaim({
    patientQuery = 'Alvarado',
    visitDate = '06/13/2026',
    pregnancyId = null,
    pageTimeoutMs = 20000,
    mode = null,
    onProgress = null,
  } = {}) {
    const RESERVED_NEEDLES = new Set([
      'birth', 'prenatal', 'postpartum', 'claim', 'submitted', 'invoice', 'hcfa', 'ub04',
      'client', 'patient', 'mother', 'baby', 'bills', 'sent', 'filter', 'status', 'open',
    ]);
    const wantName = String(patientQuery || 'Alvarado')
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/[\s,]+/)
      .filter((p) => p.length > 3 && !RESERVED_NEEDLES.has(p))
      .sort((a, b) => b.length - a.length)[0] || 'alvarado';
    if (RESERVED_NEEDLES.has(String(patientQuery || '').toLowerCase().trim()) || wantName === 'birth') {
      // Never probe Sent Bills with generic words — false-positive on UI chrome ("Prenatal & Birth").
      if (String(mode || '') === 'sent_bills_only') {
        return {
          ok: false,
          filed: false,
          error: 'sent_bills_probe_requires_patient_lastname',
          message: 'Refuse Sent Bills prove with generic needle',
        };
      }
    }
    const reportDate = String(visitDate || '').trim();
    const pregId = String(pregnancyId || '').trim() || null;
    if (!reportDate && !pregId) return { ok: false, error: 'visit_date or pregnancy_id required' };
    const progress = (partial) => {
      try { if (typeof onProgress === 'function') onProgress(partial); } catch (_) { /* ignore */ }
    };

    progress({ phase: 'login' });
    let result;
    try {
      result = await Promise.race([
        login({ dryRun: false }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('login timed out after 60000ms')), 60000);
        }),
      ]);
    } catch (err) {
      return { ok: false, error: String(err?.message || err).slice(0, 200), phase: 'login' };
    }
    progress({ phase: 'login_ok' });
    const { session, screenshots } = result;
    const dailySuperBill = { path: pregId ? 'direct_InvoiceHCFAEdit' : 'direct_SuperBillReport_only' };
    try {
      const origin = new URL(session.currentUrl()).origin;

      // Tip: Generate EDI freezes Chromium — probe Sent Bills in a FRESH child/session only.
      if (String(mode || '') === 'sent_bills_only') {
        progress({ phase: 'sent_bills_only' });
        const billsUrl = `${origin}/Billing/BillingListView`;
        // Tip: page.goto(BillingListView) can wedge whole Chromium (job 3058b26b hung 240s).
        // Soft assign + URL poll with hard budget — never await page.goto.
        let billsNav = { ok: false, error: null };
        try {
          await Promise.race([
            session.page.evaluate((u) => { window.location.assign(u); }, billsUrl),
            sleep(4000).then(() => Promise.reject(new Error('bills_assign_timeout'))),
          ]);
        } catch (err) {
          billsNav = { ok: false, error: String(err?.message || err).slice(0, 120) };
        }
        const billsDeadline = Date.now() + 10000;
        while (Date.now() < billsDeadline) {
          try {
            const href = await Promise.race([
              session.page.url(),
              sleep(1500).then(() => ''),
            ]);
            if (/BillingListView/i.test(String(href || ''))) {
              billsNav = { ok: true };
              break;
            }
          } catch (_) { /* ignore */ }
          await sleep(400);
        }
        if (!billsNav.ok && !billsNav.error) billsNav = { ok: false, error: 'bills_url_poll_miss' };
        let sentBillsProbe = { checked: false, error: billsNav.error || 'nav_failed' };
        if (billsNav.ok) {
          await sleep(800);
          try {
            await evaluateWithTimeout(session.page, (needle) => {
              const datePrefer = [/this\s*month/i, /year\s*to\s*date/i, /this\s*week/i, /^today$/i];
              const dateNodes = Array.from(document.querySelectorAll('a, button, input[type="button"], label, span, li'));
              for (const re of datePrefer) {
                const dateBtn = dateNodes.find((el) => re.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
                if (dateBtn) { dateBtn.click(); break; }
              }
              const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), input[type="search"]'));
              const nameInput = document.getElementById('searchTerm')
                || inputs.find((inp) => /searchTerm|name|patient|client|search/i.test(`${inp.id || ''} ${inp.name || ''} ${inp.placeholder || ''}`))
                || inputs[0];
              if (nameInput) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (setter) setter.call(nameInput, needle);
                else nameInput.value = needle;
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(nameInput).val(needle).trigger('change');
              }
              // Local KNOW: grid stays empty until filterRecords() / #btnSearch — not generic Filter.
              if (typeof window.filterRecords === 'function') {
                window.filterRecords();
                return { filtered: true, via: 'filterRecords', nameId: nameInput?.id || nameInput?.name || null };
              }
              const go = document.getElementById('btnSearch')
                || Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
                  .find((el) => /^(search|filter|go|refresh)$/i.test((el.textContent || el.value || '').trim()));
              if (go) go.click();
              return { filtered: Boolean(nameInput), via: go ? (go.id || 'click') : 'none', nameId: nameInput?.id || nameInput?.name || null };
            }, wantName, 5000);
            await sleep(3500);
          } catch (_) { /* ignore */ }
          try {
            sentBillsProbe = await evaluateWithTimeout(session.page, (needle) => {
              const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
              const n = String(needle || '').toLowerCase();
              const rows = Array.from(document.querySelectorAll('table tr, .k-grid-content tr'))
                .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())
                .filter((t) => {
                  if (!t || !n || !t.toLowerCase().includes(n)) return false;
                  // Require a real claim row (date + HCFA/claim #), not filter chrome containing "birth".
                  return /\bHCFA\b|\bUB\s*-?\s*04\b|\b\d{5,}\b/.test(t) && /\d{1,2}\/\d{1,2}\/\d{4}/.test(t);
                })
                .slice(0, 8);
              const claimSubmitted = rows.some((t) => /claim\s*submitted/i.test(t));
              return {
                checked: true,
                noItems: /no items to display|no records|no data/i.test(text) && !rows.length,
                nameHit: Boolean(rows.length),
                claimSubmitted,
                rows,
                preview: text.slice(0, 500),
              };
            }, wantName, 5000);
          } catch (err) {
            sentBillsProbe = { checked: false, error: String(err?.message || err).slice(0, 120) };
          }
        }
        return {
          ok: true,
          filed: Boolean(sentBillsProbe?.nameHit),
          mode: 'sent_bills_only',
          sentBillsProbe,
          message: sentBillsProbe?.nameHit ? `Sent Bills shows ${wantName}` : 'Sent Bills probe: no name hit',
          screenshots,
          url: session.page.url(),
        };
      }

      // Fast money path: skip SuperBill when pregnancy id is known (tip CDP wedge on report→editor).
      if (pregId) {
        const abs = `${origin}/Billing/InvoiceHCFAEdit?pregnancyID=${encodeURIComponent(pregId)}`;
        progress({ phase: 'goto_claim_editor', url: abs, via: 'direct_pregnancy_id' });
        // Tip: page.goto(InvoiceHCFAEdit) can wedge Chromium until Railway kills the worker
        // (heartbeats freeze; job looks "stale"). Prefer location.assign + URL poll with hard budget.
        let editorNav = { ok: false, error: null };
        try {
          await Promise.race([
            session.page.evaluate((u) => { window.location.assign(u); }, abs),
            new Promise((_, reject) => setTimeout(() => reject(new Error('assign_timeout')), 5000)),
          ]);
        } catch (err) {
          editorNav = { ok: false, error: String(err?.message || err).slice(0, 120) };
        }
        if (!editorNav.error) {
          const deadline = Date.now() + 18000;
          while (Date.now() < deadline) {
            const cur = session.page.url();
            if (/InvoiceHCFAEdit/i.test(cur)) {
              editorNav = { ok: true, url: cur };
              break;
            }
            await sleep(300);
          }
          if (!editorNav.ok) {
            // One short goto fallback — never wait networkidle.
            editorNav = await gotoWithBudget(session.page, abs, { timeout: 12000 });
          }
        }
        try {
          await Promise.race([
            dismissSessionTakeover(session.page),
            sleep(2500),
          ]);
        } catch (_) { /* ignore */ }
        dailySuperBill.interact = {
          editorNav: {
            ok: editorNav.ok,
            url: abs,
            error: editorNav.error || null,
            via: 'direct_pregnancy_id_soft',
            landed: session.page.url(),
          },
          attempts: [{ label: 'claim_link', ok: editorNav.ok, phase: 'direct', href: `/Billing/InvoiceHCFAEdit?pregnancyID=${pregId}` }],
        };
        progress({ phase: 'claim_editor_landed', editorNav: dailySuperBill.interact.editorNav });
        if (!editorNav.ok) {
          return {
            ok: false,
            error: editorNav.error || 'InvoiceHCFAEdit nav failed',
            pregnancyId: pregId,
            dailySuperBill,
            screenshots,
          };
        }
        // Tip: soft location.assign leaves the frame mid-nav; next page.evaluate (dismiss/fill)
        // can wedge CDP forever (job stuck claim_editor_landed). Settle with hard budget first.
        progress({ phase: 'claim_link', claimLinkOk: true });
        try {
          await Promise.race([
            session.page.waitForFunction(
              () => document.readyState === 'interactive' || document.readyState === 'complete',
              { timeout: 6000 },
            ),
            sleep(6000),
          ]);
        } catch (_) { /* ignore */ }
        await sleep(500);
        try {
          await Promise.race([
            dismissSessionTakeover(session.page),
            sleep(2500),
          ]);
        } catch (_) { /* ignore */ }

        const claimLinkOk = true;
        const editorAttempts = [];
        const runEditorStep = async (label, fn, arg, timeoutMs = 12000) => {
          progress({ phase: `editor_${label}` });
          try {
            const out = arguments.length >= 3 && typeof arg !== 'number'
              ? await evaluateWithTimeout(session.page, fn, arg, timeoutMs)
              : await evaluateWithTimeout(session.page, fn, undefined, typeof arg === 'number' ? arg : timeoutMs);
            editorAttempts.push({ label, ok: true, ...(out && typeof out === 'object' ? out : { value: out }) });
            return out;
          } catch (err) {
            editorAttempts.push({ label, ok: false, error: String(err?.message || err).slice(0, 120) });
            return null;
          }
        };

        // Tip: full DOM inventory + Insured Information block scan wedged tip after soft nav.
        // Prefer known ClientCare field ids; keep select fills narrow.
        await runEditorStep('fill_required', () => {
          const fills = [];
          const setSelectByCtx = (preferRe, ctxRe, label) => {
            for (const sel of Array.from(document.querySelectorAll('select'))) {
              const ctx = `${sel.id || ''} ${sel.name || ''} ${(sel.previousElementSibling?.textContent || '')}`.toLowerCase();
              if (!ctxRe.test(ctx)) continue;
              const pick = Array.from(sel.options || []).find((o) => preferRe.test((o.textContent || '').trim()) && o.value);
              if (!pick) continue;
              sel.value = pick.value;
              Array.from(sel.options).forEach((o) => { o.selected = o === pick; });
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              fills.push({ label, text: (pick.textContent || '').trim().slice(0, 50) });
              return true;
            }
            return false;
          };
          setSelectByCtx(/cora\s*williams|williams\s*dem|well\s*rounded/i, /rendering|bill\s*under|provider/, 'rendering');
          setSelectByCtx(/home|birth\s*center|office|well\s*rounded|clinic/i, /facility|place\s*of\s*service/, 'facility');
          setSelectByCtx(/claim\s*submitted|submitted|open/i, /claim\s*progress|progress/, 'progress');
          setSelectByCtx(/group\s*health|other|commercial/i, /plan\s*type|plantype|typeof\s*plan/, 'plan_type');
          const setInput = (inp, value, label) => {
            if (!inp) return false;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(inp, value);
            else inp.value = value;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            fills.push({ label, text: String(value).slice(0, 50) });
            return true;
          };
          const motherFirst = document.getElementById('mother_FirstName')?.value || 'Denise';
          const motherLast = document.getElementById('mother_LastName')?.value || 'Alvarado';
          const insuredFirstEl = document.getElementById('PrimaryInsurance_InsuredsNameFirst');
          const insuredLastEl = document.getElementById('PrimaryInsurance_InsuredsNameLast');
          const insuredFirst = (insuredFirstEl?.value || '').trim();
          const insuredLast = (insuredLastEl?.value || '').trim();
          const namesMatch = motherFirst && insuredFirst
            && motherFirst.toLowerCase() === insuredFirst.toLowerCase()
            && motherLast.toLowerCase() === insuredLast.toLowerCase();
          if (!namesMatch && insuredFirst) {
            const spouseInput = Array.from(document.querySelectorAll('input[type="radio"]'))
              .find((el) => /spouse/i.test(`${el.id || ''} ${el.value || ''} ${el.name || ''}`));
            if (spouseInput) {
              spouseInput.click();
              fills.push({ label: 'patient_rel_spouse', text: 'Spouse' });
            }
          } else if (insuredFirstEl && motherFirst && !insuredFirst) {
            setInput(insuredFirstEl, motherFirst, 'insured_first');
            if (insuredLastEl) setInput(insuredLastEl, motherLast, 'insured_last');
          }
          const insuredSign = document.getElementById('InsuredSign');
          if (insuredSign && !(insuredSign.value || '').trim()) {
            const signName = [insuredFirst || motherFirst, insuredLast || motherLast].filter(Boolean).join(' ');
            setInput(insuredSign, signName, 'insured_sign');
          }
          const patientSign = document.getElementById('PatientSign');
          if (patientSign && !(patientSign.value || '').trim()) {
            setInput(patientSign, [motherFirst, motherLast].filter(Boolean).join(' '), 'patient_sign');
          }
          for (const lab of Array.from(document.querySelectorAll('label')).slice(0, 80)) {
            const t = (lab.textContent || '').replace(/\s+/g, ' ').trim();
            if (/^group\s*health\s*plan$/i.test(t)) {
              const input = lab.querySelector('input[type="radio"], input[type="checkbox"]')
                || document.getElementById(lab.getAttribute('for') || '');
              if (input) { input.click(); fills.push({ label: 'plan_type_radio', text: t }); break; }
            }
          }
          return {
            fills,
            url: location.href,
            title: document.title || null,
            patientName: [motherFirst, motherLast].filter(Boolean).join(' '),
            insuredFirst: insuredFirst || null,
            insuredLast: insuredLast || null,
          };
        }, 8000);
        await sleep(800);

        // Tip 1a8dd272 proved Ally panel after Save+Continue. Race both (never await CDP forever).
        progress({ phase: 'editor_save' });
        try {
          const saved = await Promise.race([
            session.page.evaluate(() => {
              const nodes = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
              const btn = nodes.find((el) => {
                const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
                return /^save$/i.test(t) || /^save\s*invoice$/i.test(t) || /^save\s*claim$/i.test(t);
              });
              if (!btn) return { clicked: false };
              if (window.jQuery) window.jQuery(btn).trigger('click');
              else btn.click();
              return { clicked: true, text: (btn.textContent || btn.value || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
            }),
            sleep(1500).then(() => ({ raced: true })),
          ]);
          editorAttempts.push({ label: 'save', ok: true, ...(saved || {}) });
        } catch (err) {
          editorAttempts.push({ label: 'save', ok: false, error: String(err?.message || err).slice(0, 100) });
        }
        await sleep(500);

        progress({ phase: 'editor_continue' });
        try {
          const cont = await Promise.race([
            session.page.evaluate(() => {
              const nodes = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
              const btn = nodes.find((el) => /continue\s*saving\s*invoice|^continue$/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
              if (!btn) return { clicked: false };
              if (window.jQuery) window.jQuery(btn).trigger('click');
              else btn.click();
              return { clicked: true, text: (btn.textContent || btn.value || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
            }),
            sleep(1500).then(() => ({ raced: true })),
          ]);
          editorAttempts.push({ label: 'continue', ok: true, ...(cont || {}) });
        } catch (err) {
          editorAttempts.push({ label: 'continue', ok: false, error: String(err?.message || err).slice(0, 100) });
        }
        await sleep(600);

        // Prefer ClaimSentMethodID=EDI on the form itself.
        try {
          const method = await Promise.race([
            session.page.evaluate(() => {
              const sel = document.getElementById('ClaimSentMethodID');
              if (!sel) return { set: false };
              const pick = Array.from(sel.options || []).find((o) => /^edi$/i.test((o.textContent || '').trim()));
              if (!pick) return { set: false, options: Array.from(sel.options || []).map((o) => (o.textContent || '').trim()).slice(0, 6) };
              sel.value = pick.value;
              Array.from(sel.options).forEach((o) => { o.selected = o === pick; });
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              if (window.jQuery) window.jQuery(sel).trigger('change');
              return { set: true, text: 'EDI' };
            }),
            sleep(1500).then(() => ({ raced: true })),
          ]);
          editorAttempts.push({ label: 'claim_sent_method_edi', ok: true, ...(method || {}) });
        } catch (err) {
          editorAttempts.push({ label: 'claim_sent_method_edi', ok: false, error: String(err?.message || err).slice(0, 100) });
        }

        progress({ phase: 'editor_edi' });
        try {
          const opened = await Promise.race([
            session.page.evaluate(() => {
              const panel = document.getElementById('divSendEDI');
              const tab = document.getElementById('divEDI');
              const wasHidden = !panel || window.getComputedStyle(panel).display === 'none';
              if (wasHidden && tab && typeof window.showhide === 'function') {
                window.showhide(tab);
              }
              if (panel) {
                panel.style.display = 'block';
                panel.style.visibility = 'visible';
                panel.style.height = 'auto';
                panel.style.overflow = 'visible';
              }
              location.hash = 'divSendEDI';
              const innerSelects = Array.from((panel || document).querySelectorAll('select')).map((sel) => ({
                id: sel.id || null,
                name: sel.name || null,
                texts: Array.from(sel.options || []).map((o) => (o.textContent || '').trim()).filter(Boolean).slice(0, 10),
              }));
              const innerBtns = Array.from((panel || document).querySelectorAll('a, button, input[type="button"], input[type="submit"]'))
                .map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
                .filter(Boolean)
                .slice(0, 20);
              return {
                via: wasHidden ? 'showhide_then_force_block' : 'force_block_already_open',
                hasDiv: Boolean(panel),
                display: panel ? window.getComputedStyle(panel).display : null,
                innerSelects,
                innerBtns,
                panelHtmlLen: panel ? (panel.innerHTML || '').length : 0,
              };
            }),
            sleep(3000).then(() => ({ skipped: 'edi_open_timeout' })),
          ]);
          editorAttempts.push({ label: 'edi', ok: true, ...(opened || {}) });
        } catch (err) {
          editorAttempts.push({ label: 'edi', ok: false, error: String(err?.message || err).slice(0, 120) });
        }

        // Tip 53380b61 KNOW: #divSendEDI opens with ONLY "Generate EDI" and zero selects.
        // Waiting for Ally before Generate is a deadlock — Ally/Clearing House paints after
        // the first Generate EDI click (historical Ally-open runs used Generate-first).
        try {
          session.page.once('dialog', async (dialog) => {
            try { await dialog.accept(); } catch (_) { /* ignore */ }
          });
        } catch (_) { /* ignore */ }
        let downloadHint = null;
        try {
          session.page.once('download', (download) => {
            downloadHint = { suggested: download.suggestedFilename?.() || null };
          });
        } catch (_) { /* ignore */ }

        const editorPage = session.page;
        const netHits = [];
        try {
          editorPage.on('request', (req) => {
            const u = String(req.url() || '');
            if (/edi|ally|837|claim|hcfa|billing|submit|generate/i.test(u)) {
              netHits.push({ type: 'req', method: req.method(), url: u.slice(0, 180) });
            }
          });
          editorPage.on('response', (res) => {
            const u = String(res.url() || '');
            if (/edi|ally|837|claim|hcfa|billing|submit|generate/i.test(u)) {
              let method = null;
              try { method = res.request()?.method?.() || null; } catch (_) { method = null; }
              netHits.push({ type: 'res', status: res.status(), method, url: u.slice(0, 180) });
            }
          });
        } catch (_) { /* ignore */ }

        const scanAllyReady = async (pollN) => Promise.race([
          editorPage.evaluate((n) => {
            const panel = document.getElementById('divSendEDI');
            if (panel) {
              panel.style.display = 'block';
              panel.style.visibility = 'visible';
              panel.style.height = 'auto';
            }
            const texts = [];
            for (const sel of Array.from(document.querySelectorAll('select'))) {
              for (const o of Array.from(sel.options || [])) {
                const t = (o.textContent || '').trim();
                if (t) texts.push(t);
              }
            }
            const body = (document.body?.innerText || '').replace(/\s+/g, ' ');
            const panelText = (panel ? (panel.innerText || panel.textContent || '') : '').replace(/\s+/g, ' ');
            const ready = texts.some((t) => /office\s*ally|wrmomma/i.test(t))
              || /clearing\s*house/i.test(panelText)
              || /save\s*edi\s*document/i.test(body)
              || /generate\s*hcfa\s*edi/i.test(body);
            const genBtn = Array.from((panel || document).querySelectorAll('a, button, input[type="button"], input[type="submit"]'))
              .find((el) => /^generate\s*edi$/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
            return {
              ready,
              polls: n + 1,
              panelLen: panel ? (panel.innerHTML || '').length : 0,
              sample: texts.filter((t) => /ally|clearing|office|edi|wrmomma/i.test(t)).slice(0, 8),
              panelSnippet: panelText.slice(0, 240),
              genMeta: genBtn ? {
                id: genBtn.id || null,
                tag: genBtn.tagName,
                onclick: String(genBtn.getAttribute('onclick') || '').slice(0, 160),
                href: String(genBtn.getAttribute('href') || '').slice(0, 80),
              } : null,
              iframes: Array.from(document.querySelectorAll('iframe')).map((f) => (f.id || f.name || f.src || '').slice(0, 80)).slice(0, 6),
            };
          }, pollN),
          sleep(1200).then(() => ({ ready: false, polls: pollN + 1, raced: true })),
        ]);

        progress({ phase: 'wait_ally_options' });
        let allyReady = { ready: false, polls: 0 };
        try {
          allyReady = await scanAllyReady(0);
        } catch (err) {
          allyReady = { ready: false, polls: 1, error: String(err?.message || err).slice(0, 80) };
        }
        editorAttempts.push({ label: 'wait_ally_options_pre', ok: Boolean(allyReady?.ready), ...(allyReady || {}) });

        if (!allyReady?.ready) {
          progress({ phase: 'editor_generate_reveal_ally' });
          try {
            const reveal = await Promise.race([
              editorPage.evaluate(() => {
                const panel = document.getElementById('divSendEDI');
                if (panel) {
                  panel.style.display = 'block';
                  panel.style.visibility = 'visible';
                  panel.style.height = 'auto';
                }
                const scope = panel || document;
                const candidates = Array.from(scope.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
                const best = candidates.find((el) => /^generate\s*edi$/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()))
                  || candidates.find((el) => /generate\s*edi/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
                if (!best) {
                  return {
                    clicked: false,
                    panelBtns: candidates.map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12),
                  };
                }
                if (window.jQuery) window.jQuery(best).trigger('click');
                else best.click();
                return {
                  clicked: true,
                  text: (best.textContent || best.value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
                  onclick: String(best.getAttribute('onclick') || '').slice(0, 160),
                };
              }),
              sleep(2000).then(() => ({ raced: true })),
            ]);
            editorAttempts.push({ label: 'generate_reveal_ally', ok: Boolean(reveal?.clicked), ...(reveal || {}) });
          } catch (err) {
            editorAttempts.push({ label: 'generate_reveal_ally', ok: false, error: String(err?.message || err).slice(0, 120) });
          }
          for (let poll = 0; poll < 12; poll += 1) {
            await sleep(700);
            try {
              allyReady = await scanAllyReady(poll + 1);
            } catch (err) {
              allyReady = { ready: false, polls: poll + 2, error: String(err?.message || err).slice(0, 80) };
            }
            if (allyReady?.ready) break;
          }
        }
        editorAttempts.push({ label: 'wait_ally_options', ok: Boolean(allyReady?.ready), ...(allyReady || {}) });

        // Tip/local KNOW: Generate EDI is <a href="/Billing/SendHCFAEDIEdit?billingID=…"> — Ally lives
        // on that page, not inside #divSendEDI. Navigate there when href appears.
        if (!allyReady?.ready) {
          progress({ phase: 'editor_nav_send_hcfa_edi' });
          try {
            const sendMeta = await Promise.race([
              editorPage.evaluate(() => {
                const nodes = Array.from(document.querySelectorAll('a[href*="SendHCFAEDIEdit"], a'));
                let href = null;
                for (const a of nodes) {
                  const h = a.getAttribute('href') || a.href || '';
                  if (/SendHCFAEDIEdit/i.test(h)) { href = h; break; }
                }
                const billingId =
                  (href && (href.match(/billingID=([0-9a-f-]{20,})/i) || [])[1])
                  || (document.body.innerHTML.match(/billingID[=:][\s'\"]*([0-9a-f-]{20,})/i) || [])[1]
                  || null;
                return { href, billingId, url: location.href };
              }),
              sleep(2000).then(() => ({ raced: true })),
            ]);
            editorAttempts.push({ label: 'send_hcfa_edi_meta', ok: Boolean(sendMeta?.href || sendMeta?.billingId), ...(sendMeta || {}) });
            const targetHref = sendMeta?.href
              || (sendMeta?.billingId ? `/Billing/SendHCFAEDIEdit?billingID=${sendMeta.billingId}` : null);
            if (targetHref) {
              const abs = new URL(targetHref, origin).href;
              const nav = await gotoWithBudget(editorPage, abs, {
                timeout: Math.max(10000, Number(pageTimeoutMs) || 20000),
              });
              editorAttempts.push({ label: 'nav_send_hcfa_edi', ok: Boolean(nav?.ok), url: abs, error: nav?.error || null });
              if (nav?.ok) {
                await sleep(1500);
                // SendHCFAEDIEdit needs jQuery for SetSelectionEDI(); page sometimes has $ missing.
                try {
                  const hasJq = await Promise.race([
                    editorPage.evaluate(() => typeof window.jQuery === 'function' || typeof window.$ === 'function'),
                    sleep(1500).then(() => false),
                  ]);
                  if (!hasJq) {
                    await editorPage.addScriptTag({ url: 'https://code.jquery.com/jquery-3.6.0.min.js' }).catch(() => null);
                    await sleep(400);
                  } else {
                    await editorPage.evaluate(() => {
                      if (typeof window.$ !== 'function' && typeof window.jQuery === 'function') window.$ = window.jQuery;
                    }).catch(() => null);
                  }
                } catch (_) { /* ignore */ }
                for (let poll = 0; poll < 10; poll += 1) {
                  try {
                    allyReady = await scanAllyReady(poll);
                  } catch (err) {
                    allyReady = { ready: false, polls: poll + 1, error: String(err?.message || err).slice(0, 80) };
                  }
                  if (allyReady?.ready) break;
                  await sleep(600);
                }
                editorAttempts.push({ label: 'wait_ally_on_send_page', ok: Boolean(allyReady?.ready), ...(allyReady || {}) });
              }
            }
          } catch (err) {
            editorAttempts.push({ label: 'nav_send_hcfa_edi', ok: false, error: String(err?.message || err).slice(0, 120) });
          }
        }

        const buttonMeta = {
          via: 'send_hcfa_edi_page_then_stage',
          allyReady: Boolean(allyReady?.ready),
          genMeta: allyReady?.genMeta || null,
        };
        editorAttempts.push({ label: 'edi_button_meta', ok: true, ...buttonMeta });

        const burst = {
          ally: false,
          allyText: null,
          eob: false,
          save: false,
          generate: false,
          generateText: null,
          claimSentDate: null,
          claimSentDateSet: false,
          panelBtns: [],
          panelHtmlSnippet: null,
        };

        progress({ phase: 'editor_select_ally' });
        try {
          const allyPick = await Promise.race([
            editorPage.evaluate(() => {
              const panel = document.getElementById('divSendEDI');
              if (panel) {
                panel.style.display = 'block';
                panel.style.visibility = 'visible';
                panel.style.height = 'auto';
              }
              const out = {
                ally: false,
                allyText: null,
                eob: false,
                selectCount: 0,
                optionSamples: [],
                panelSelectIds: [],
                panelHtmlSnippet: (panel ? (panel.innerText || panel.textContent || '') : '').replace(/\s+/g, ' ').trim().slice(0, 500),
              };
              const panelSels = Array.from((panel || document.createElement('div')).querySelectorAll('select'));
              out.panelSelectIds = panelSels.map((s) => s.id || s.name || '(anon)');
              const sels = Array.from(document.querySelectorAll('select'));
              out.selectCount = sels.length;
              for (const sel of sels) {
                const opts = Array.from(sel.options || []);
                const texts = opts.map((o) => (o.textContent || '').trim()).filter(Boolean);
                if (out.optionSamples.length < 12) {
                  out.optionSamples.push({ id: sel.id || null, name: sel.name || null, texts: texts.slice(0, 8) });
                }
                const pick = opts.find((o) => /office\s*ally|wrmomma/i.test(o.textContent || ''))
                  || opts.find((o) => /\bally\b/i.test(o.textContent || '') && !/medicare|secondary/i.test(o.textContent || ''));
                if (!pick) continue;
                sel.value = pick.value;
                opts.forEach((o) => { o.selected = o === pick; });
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(sel).trigger('change');
                out.ally = true;
                out.allyText = (pick.textContent || '').trim().slice(0, 60);
                break;
              }
              const scope = panel || document.body;
              for (const node of Array.from(scope.querySelectorAll('input[type="checkbox"], label'))) {
                const t = (node.textContent || node.value || node.id || '').replace(/\s+/g, ' ').trim();
                if (!/include\s*eob|eob/i.test(`${t} ${node.id || ''}`)) continue;
                const input = node.tagName === 'INPUT' ? node : document.getElementById(node.getAttribute('for') || '') || node.querySelector('input');
                if (!input) continue;
                if (!input.checked) {
                  input.checked = true;
                  input.click();
                  if (window.jQuery) window.jQuery(input).trigger('change');
                }
                out.eob = true;
                break;
              }
              return out;
            }),
            sleep(2500).then(() => ({ raced: true })),
          ]);
          Object.assign(burst, allyPick || {});
          editorAttempts.push({ label: 'select_ally', ok: Boolean(allyPick?.ally), ...(allyPick || {}) });
        } catch (err) {
          editorAttempts.push({ label: 'select_ally', ok: false, error: String(err?.message || err).slice(0, 120) });
        }

        if (burst.ally) await sleep(900);

        progress({ phase: 'editor_save_edi_doc' });
        try {
          const savedEdi = await Promise.race([
            editorPage.evaluate(() => {
              const candidates = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
              const panel = document.getElementById('divSendEDI');
              const saveBtn = candidates.find((el) => /save\s*edi\s*document/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
              if (!saveBtn) {
                return {
                  save: false,
                  panelBtns: candidates
                    .map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
                    .filter((t) => /edi|ally|generate|save|clearing|eob/i.test(t))
                    .slice(0, 25),
                  panelHtmlSnippet: (panel ? (panel.innerText || panel.textContent || '') : '').replace(/\s+/g, ' ').trim().slice(0, 500),
                };
              }
              if (window.jQuery) window.jQuery(saveBtn).trigger('click');
              else saveBtn.click();
              return { save: true, saveText: (saveBtn.textContent || saveBtn.value || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
            }),
            sleep(2000).then(() => ({ raced: true })),
          ]);
          Object.assign(burst, savedEdi || {});
          editorAttempts.push({ label: 'save_edi_document', ok: Boolean(savedEdi?.save), ...(savedEdi || {}) });
        } catch (err) {
          editorAttempts.push({ label: 'save_edi_document', ok: false, error: String(err?.message || err).slice(0, 120) });
        }
        if (burst.save) await sleep(700);

        progress({ phase: 'editor_generate_hcfa_edi' });
        try {
          const gen = await Promise.race([
            editorPage.evaluate((allowBare) => {
              const panel = document.getElementById('divSendEDI');
              const candidates = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
              const labelOf = (el) => (el.innerText || el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
              const out = {
                generate: false,
                generateText: null,
                generateInPanel: false,
                panelBtns: candidates
                  .map((el) => labelOf(el))
                  .filter((t) => t && /edi|ally|generate|save|clearing|eob|hcfa/i.test(t) && t.length < 80)
                  .slice(0, 25),
                panelHtmlSnippet: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500),
                claimSentDate: null,
              };
              let best = candidates.find((el) => /generate\s*hcfa\s*edi/i.test(labelOf(el)) && labelOf(el).length < 40)
                || candidates.find((el) => /generate\s*edi\s*claim/i.test(labelOf(el)) && labelOf(el).length < 40)
                || candidates.find((el) => /^generate$/i.test(labelOf(el)));
              if (!best && allowBare) {
                best = candidates.find((el) => /^generate\s*edi$/i.test(labelOf(el)));
              }
              if (best) {
                let via = null;
                let fnResult = null;
                if (typeof window.jQuery === 'function' && typeof window.$ !== 'function') {
                  window.$ = window.jQuery;
                }
                // SetSelectionEDI only fills hidden chart/billing fields — it does NOT POST.
                // The Generate control is type=submit; real transmit is the form POST.
                if (typeof window.SetSelectionEDI === 'function') {
                  try {
                    fnResult = window.SetSelectionEDI();
                  } catch (err) {
                    fnResult = String(err?.message || err).slice(0, 80);
                  }
                }
                if (window.jQuery) window.jQuery(best).trigger('click');
                else best.click();
                via = typeof window.SetSelectionEDI === 'function'
                  ? 'SetSelectionEDI+submit_click'
                  : 'submit_click';
                out.generate = true;
                out.generateText = labelOf(best).slice(0, 60);
                out.generateInPanel = Boolean(panel && panel.contains(best));
                out.generateHref = String(best.getAttribute('href') || '').slice(0, 120);
                out.generateOnclick = String(best.getAttribute('onclick') || '').slice(0, 160);
                out.generateVia = via;
                out.fnResult = fnResult === undefined ? null : fnResult;
                out.hasJquery = typeof window.jQuery === 'function';
                out.hasDollar = typeof window.$ === 'function';
                out.formAction = String((best.form || best.closest?.('form') || {})?.action || '').slice(0, 120);
              } else {
                out.generateMiss = out.panelBtns;
              }
              const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
              const sent = bodyText.match(/Claim\s*Sent\s*Date[:\s]*([0-9/\-]{6,20}|null|N\/?A)?/i);
              out.claimSentDate = sent ? (sent[1] || null) : null;
              return out;
            }, true),
            sleep(2500).then(() => ({ raced: true })),
          ]);
          Object.assign(burst, gen || {});
          editorAttempts.push({ label: 'generate_hcfa_edi', ok: Boolean(gen?.generate), ...(gen || {}) });
        } catch (err) {
          editorAttempts.push({ label: 'generate_hcfa_edi', ok: false, error: String(err?.message || err).slice(0, 120) });
        }

        if (burst.generate) {
          progress({ phase: 'editor_wait_send_post' });
          const postWaitDeadline = Date.now() + 20000;
          let postReq = null;
          let postRes = null;
          while (Date.now() < postWaitDeadline) {
            postReq = netHits.find((h) => h.type === 'req' && h.method === 'POST' && /SendHCFAEDIEdit/i.test(h.url || ''))
              || null;
            postRes = netHits.find((h) => h.type === 'res' && h.method === 'POST' && /SendHCFAEDIEdit/i.test(h.url || ''))
              || null;
            if (postReq && postRes) break;
            await sleep(400);
          }
          let afterGen = null;
          try {
            afterGen = await Promise.race([
              editorPage.evaluate(() => {
                const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
                const err = Array.from(document.querySelectorAll('.validation-summary-errors, .field-validation-error, .alert, .error, #error'))
                  .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
                  .filter(Boolean)
                  .slice(0, 5);
                let successJson = null;
                try {
                  const parsed = JSON.parse(text);
                  if (parsed && typeof parsed === 'object') successJson = parsed;
                } catch (_) { /* not json */ }
                return {
                  url: location.href,
                  title: document.title,
                  text: text.slice(0, 800),
                  errors: err,
                  hasDownloadLink: /download|\.edi|837/i.test(text),
                  successJson,
                  transmitOk: Boolean(successJson?.success === true) || /download|\.edi|837/i.test(text),
                };
              }),
              sleep(3000).then(() => ({ raced: true })),
            ]);
          } catch (err) {
            afterGen = { error: String(err?.message || err).slice(0, 120) };
          }
          const postResLate = netHits.find((h) => h.type === 'res' && h.method === 'POST' && /SendHCFAEDIEdit/i.test(h.url || '')) || postRes;
          editorAttempts.push({
            label: 'wait_send_post',
            ok: Boolean(postReq && (postResLate || afterGen?.transmitOk || afterGen?.successJson?.success)),
            postReq: postReq ? { url: postReq.url, method: postReq.method } : null,
            postRes: postResLate,
            download: downloadHint,
            afterGen,
            netTail: netHits.slice(-12),
          });
          if (postReq) burst.ediPostOk = true;
        }

        // Local KNOW: after Generate POST the page is raw {"success":true} — ClaimSentDate lives
        // back on InvoiceHCFAEdit. Return there, stamp today, Save (+Continue).
        if ((burst.generate || burst.ediPostOk) && pregId) {
          progress({ phase: 'editor_return_claim_sent_date' });
          try {
            const backUrl = `${origin}/Billing/InvoiceHCFAEdit?pregnancyID=${encodeURIComponent(pregId)}`;
            const backNav = await gotoWithBudget(editorPage, backUrl, {
              timeout: Math.max(10000, Number(pageTimeoutMs) || 20000),
            });
            editorAttempts.push({ label: 'return_invoice_hcfa', ok: Boolean(backNav?.ok), url: backUrl, error: backNav?.error || null });
            if (backNav?.ok) await sleep(1500);
          } catch (err) {
            editorAttempts.push({ label: 'return_invoice_hcfa', ok: false, error: String(err?.message || err).slice(0, 120) });
          }
        }

        if (burst.generate || burst.save || burst.ally || burst.ediPostOk) {
          await sleep(600);
          try {
            const painted = await Promise.race([
              editorPage.evaluate(() => {
                const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
                const sent = bodyText.match(/Claim\s*Sent\s*Date[:\s]*([0-9/\-]{6,20}|null|N\/?A)?/i);
                const today = new Date();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const yyyy = String(today.getFullYear());
                const stamp = `${mm}/${dd}/${yyyy}`;
                let claimSentDateSet = false;
                let claimSentDateName = null;
                const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="date"], input:not([type]), input[name="ClaimSentDate"]'));
                for (const inp of inputs) {
                  const key = `${inp.id || ''} ${inp.name || ''} ${inp.placeholder || ''}`;
                  if (!/claim.*sent.*date|sent.*date|ClaimSentDate/i.test(key)) continue;
                  if (window.jQuery && window.jQuery.fn?.datepicker) {
                    try {
                      window.jQuery(inp).datepicker('setDate', new Date(Number(yyyy), Number(mm) - 1, Number(dd)));
                    } catch (_) {
                      window.jQuery(inp).val(stamp).trigger('change');
                    }
                  } else {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                    if (setter) setter.call(inp, stamp);
                    else inp.value = stamp;
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    if (window.jQuery) window.jQuery(inp).trigger('change');
                  }
                  claimSentDateSet = Boolean(inp.value);
                  claimSentDateName = inp.name || inp.id || null;
                  break;
                }
                return {
                  claimSentDate: sent ? (sent[1] || null) : null,
                  claimSentDateSet,
                  claimSentDateName,
                  stamp,
                  href: location.href,
                };
              }),
              sleep(2500).then(() => ({ raced: true })),
            ]);
            if (painted?.claimSentDate) burst.claimSentDate = painted.claimSentDate;
            if (painted?.claimSentDateSet) burst.claimSentDateSet = true;
            editorAttempts.push({ label: 'claim_sent_date_paint', ok: Boolean(painted?.claimSentDateSet), ...(painted || {}) });
            if (painted?.claimSentDateSet) {
              const saveAfter = await Promise.race([
                editorPage.evaluate(() => {
                  const btn = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'))
                    .find((el) => /^save$/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
                  if (!btn) return { clicked: false };
                  if (window.jQuery) window.jQuery(btn).trigger('click');
                  else btn.click();
                  return { clicked: true };
                }),
                sleep(2000).then(() => ({ raced: true })),
              ]);
              editorAttempts.push({ label: 'save_after_claim_sent_date', ok: Boolean(saveAfter?.clicked), ...(saveAfter || {}) });
              await sleep(1200);
              const contAfter = await Promise.race([
                editorPage.evaluate(() => {
                  const btn = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'))
                    .find((el) => /continue\s*saving/i.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
                  if (!btn) return { clicked: false };
                  if (window.jQuery) window.jQuery(btn).trigger('click');
                  else btn.click();
                  return { clicked: true, text: (btn.textContent || btn.value || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
                }),
                sleep(2000).then(() => ({ raced: true })),
              ]);
              editorAttempts.push({ label: 'continue_after_claim_sent_date', ok: Boolean(contAfter?.clicked), ...(contAfter || {}) });
              if (contAfter?.clicked) await sleep(1500);
            }
          } catch (_) { /* ignore */ }
        }

        editorAttempts.push({ label: 'transmit_burst', ok: true, ...burst, netHits: netHits.slice(0, 40) });

        const transmitTouched = Boolean(burst.ally || burst.save || burst.generate || burst.claimSentDateSet);
        dailySuperBill.claimEditor = {
          isEditor: true,
          attempts: editorAttempts,
          preview: null,
          receipt: {
            method: 'EDI',
            hasEdiPanel: true,
            via: transmitTouched ? 'generate_reveal_split_probe' : 'edi_panel_no_transmit',
            buttonMeta,
            download: downloadHint,
          },
        };
        progress({ phase: 'generate_fired_exit' });
        return {
          ok: true,
          filed: false,
          needs_sent_bills_probe: true,
          patientQuery: wantName,
          pregnancyId: pregId,
          visitDate: reportDate || null,
          claimLinkOk: true,
          claimEditor: dailySuperBill.claimEditor,
          dailySuperBill,
          message: transmitTouched
            ? 'EDI transmit touched (reveal/Ally/Save/Generate); Sent Bills probe deferred to fresh Chromium child'
            : 'EDI panel opened but Ally/Save/Generate did not fire; Sent Bills probe deferred',
          screenshots,
          url: session.page.url(),
        };


      }


      const reportUrl = `${origin}/Billing/SuperBillReport?FromDate=${encodeURIComponent(reportDate)}`;
      progress({ phase: 'nav_superbill', reportUrl });
      const reportNav = await gotoWithBudget(session.page, reportUrl, {
        timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
      });
      dailySuperBill.reportNav = { ok: reportNav.ok, url: reportUrl, error: reportNav.error || null };
      if (!reportNav.ok) return { ok: false, error: reportNav.error || 'SuperBillReport nav failed', screenshots, dailySuperBill };

      await sleep(2000);
      await dismissSessionTakeover(session.page);
      for (let w = 0; w < 8; w += 1) {
        const loading = await session.page.evaluate(() => /Loading\s*\.{0,3}/i.test(document.body?.innerText || ''));
        if (!loading) break;
        await sleep(750);
      }
      progress({ phase: 'click_claim_initial' });
      const clickClaim = async (phase) => evaluateWithTimeout(session.page, ({ wantName: needle, phase: runPhase }) => {
        const attempts = [];
        const softVisible = (el) => {
          if (!el) return false;
          const s = window.getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
          return true;
        };
        const hardVisible = (el) => {
          if (!softVisible(el)) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const nameRe = new RegExp(String(needle || 'alvarado').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const allRows = Array.from(document.querySelectorAll('table tr, .k-grid-content tr, .k-master-row, .k-detail-row'));
        const patientRows = allRows.filter((tr) => nameRe.test((tr.innerText || '').replace(/\s+/g, ' ')));
        const scopeRoots = [];
        for (const header of patientRows) {
          scopeRoots.push(header);
          let sib = header.nextElementSibling;
          for (let i = 0; i < 12 && sib; i += 1) {
            const t = (sib.innerText || '').replace(/\s+/g, ' ').trim();
            if (/primary\s*:/i.test(t) && nameRe.test(t) === false && /[A-Za-z]{3,}/.test(t.split(/primary/i)[0] || '')) break;
            if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(t) && !/5940|invoice|hcfa|ub-?04|global midwifery|generated by/i.test(t) && !nameRe.test(t)) break;
            scopeRoots.push(sib);
            sib = sib.nextElementSibling;
          }
        }
        if (!scopeRoots.length) scopeRoots.push(document.body);
        const scoreClaimEl = (el) => {
          const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
          const ownText = Array.from(el.childNodes || [])
            .filter((n) => n.nodeType === 3)
            .map((n) => String(n.textContent || '').trim())
            .filter(Boolean)
            .join(' ');
          const href = `${el.getAttribute?.('href') || ''} ${el.getAttribute?.('onclick') || ''} ${el.getAttribute?.('data-url') || ''}`;
          let score = 0;
          if (/^(invoice|hcfa|ub-?04)$/i.test(ownText || t)) score += 100;
          else if (/^(invoice|hcfa|ub-?04)$/i.test(t) && t.length < 24) score += 95;
          else if (/invoicehcfa|hcfaedit|\/hcfa|createclaim|superbill|billing\/invoice|billing\/hcfa/i.test(href)) score += 85;
          else if (/\b(invoice|hcfa|ub-?04)\b/i.test(t) && t.length < 48) score += 40;
          if (/create new client|home|clients|schedule/i.test(t)) score -= 200;
          return score;
        };
        const claimCandidates = [];
        const selectors = 'a, button, input[type="button"], input[type="submit"], span, td, [onclick], [role="link"]';
        for (const root of scopeRoots) {
          for (const el of Array.from(root.querySelectorAll(selectors)).filter(softVisible)) {
            const score = scoreClaimEl(el);
            if (score < 40) continue;
            claimCandidates.push({
              el,
              score: score + (hardVisible(el) ? 5 : 0) + 10,
              text: (el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
              href: (el.getAttribute?.('href') || '').slice(0, 160),
              onclick: (el.getAttribute?.('onclick') || '').slice(0, 160),
            });
          }
        }
        if (!claimCandidates.length) {
          for (const el of Array.from(document.querySelectorAll('a, button')).filter(softVisible)) {
            const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
            if (!/^(invoice|hcfa|ub-?04)$/i.test(t)) continue;
            const tr = el.closest('tr');
            let near = false;
            let cur = tr;
            for (let i = 0; i < 10 && cur; i += 1) {
              if (nameRe.test((cur.innerText || '').replace(/\s+/g, ' '))) { near = true; break; }
              cur = cur.previousElementSibling;
            }
            if (!near) continue;
            claimCandidates.push({
              el,
              score: /^hcfa$/i.test(t) ? 110 : 100,
              text: t.slice(0, 40),
              href: (el.getAttribute?.('href') || '').slice(0, 160),
              onclick: (el.getAttribute?.('onclick') || '').slice(0, 160),
            });
          }
        }
        claimCandidates.sort((a, b) => b.score - a.score);
        if (claimCandidates.length) {
          const prefer = claimCandidates.find((c) => /^hcfa$/i.test(c.text))
            || claimCandidates.find((c) => /hcfa/i.test(c.text) || /hcfa/i.test(c.href + c.onclick))
            || claimCandidates.find((c) => /^invoice$/i.test(c.text))
            || claimCandidates[0];
          prefer.el.click();
          attempts.push({
            label: 'claim_link',
            ok: true,
            phase: runPhase,
            text: prefer.text,
            score: prefer.score,
            href: prefer.href || null,
            count: claimCandidates.length,
            top: claimCandidates.slice(0, 5).map((c) => ({ text: c.text, score: c.score, href: c.href || null })),
          });
        } else {
          attempts.push({
            label: 'claim_link',
            ok: false,
            phase: runPhase,
            error: 'no_claim_link_in_scope',
            patient_row_preview: patientRows[0]
              ? (patientRows[0].innerText || '').replace(/\s+/g, ' ').trim().slice(0, 180)
              : null,
            global_claim_texts: Array.from(document.querySelectorAll('a, button'))
              .map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
              .filter((t) => /^(invoice|hcfa|ub-?04)$/i.test(t))
              .slice(0, 8),
          });
        }
        return {
          attempts,
          url: location.href,
          preview: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700),
          patientRowCount: patientRows.length,
          scopeRowCount: scopeRoots.length,
        };
      }, { wantName, phase }, 30000);

      let interact = await clickClaim('initial');
      if (!(interact?.attempts || []).some((a) => a.label === 'claim_link' && a.ok)) {
        const filterPass = await evaluateWithTimeout(session.page, ({ wantDate }) => {
          const attempts = [];
          const visible = (el) => {
            if (!el) return false;
            const s = window.getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          };
          if (wantDate) {
            for (const el of Array.from(document.querySelectorAll('input')).filter(visible)) {
              if (/radio|checkbox|hidden|submit|button/i.test(el.type || '')) continue;
              const ctx = `${el.id || ''} ${el.name || ''} ${el.placeholder || ''} ${el.className || ''}`;
              if (/lmp|dob|birth|born|rdo|sms|message|filtertext/i.test(ctx)) continue;
              if (!/date|from|to|dos|service|visit|bill/i.test(ctx)) continue;
              el.focus();
              el.value = String(wantDate);
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              attempts.push({ label: 'fill_date', ok: true, value: String(wantDate) });
              break;
            }
          }
          const ranked = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
            .filter(visible)
            .map((el) => {
              const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
              let score = 0;
              if (/filter|search|apply|run\s*report|refresh|load/i.test(t)) score += 40;
              if (/create\s*claim|generate\s*claim/i.test(t)) score += 100;
              if (/home|clients|create new client/i.test(t)) score -= 200;
              return { el, t, score };
            })
            .filter((x) => x.t && x.score > 0)
            .sort((a, b) => b.score - a.score);
          if (ranked[0]) {
            ranked[0].el.click();
            attempts.push({ label: 'click_action', ok: true, text: ranked[0].t.slice(0, 40), score: ranked[0].score });
          } else {
            attempts.push({ label: 'click_action', ok: false, error: 'no_report_action' });
          }
          return { attempts };
        }, { wantDate: reportDate }, 20000);
        interact.attempts = [...(interact.attempts || []), ...(filterPass?.attempts || [])];
        await sleep(3500);
        const retry = await clickClaim('after_filter');
        interact.attempts = [...(interact.attempts || []), ...(retry?.attempts || [])];
        interact.url = retry?.url || interact.url;
        interact.preview = retry?.preview || interact.preview;
        interact.patientRowCount = retry?.patientRowCount ?? interact.patientRowCount;
      }

      // Tip 2026-07-15: HCFA <a href="/Billing/InvoiceHCFAEdit?…"> click does not leave SuperBillReport.
      // Navigate directly to the claim editor URL (prefer HCFA).
      const claimHit = (interact?.attempts || []).find((a) => a.label === 'claim_link' && a.ok);
      const claimHref = claimHit?.href
        || (interact?.attempts || []).flatMap((a) => a.top || []).find((t) => /hcfa/i.test(t.text || '') || /InvoiceHCFAEdit/i.test(t.href || ''))?.href
        || null;
      if (claimHref) {
        const abs = claimHref.startsWith('http') ? claimHref : `${origin}${claimHref.startsWith('/') ? '' : '/'}${claimHref}`;
        progress({ phase: 'goto_claim_editor', url: abs });
        // Tip: page.goto to InvoiceHCFAEdit can wedge — try location.assign first, then goto race.
        let editorNav = { ok: false, error: 'not_attempted' };
        try {
          const assigned = await evaluateWithTimeout(session.page, (url) => {
            try {
              window.location.assign(url);
              return { ok: true };
            } catch (err) {
              return { ok: false, error: String(err?.message || err).slice(0, 120) };
            }
          }, abs, 8000);
          await sleep(2500);
          const landed = await session.page.evaluate(() => ({
            url: location.href,
            title: document.title || null,
            isHcfa: /InvoiceHCFAEdit|HCFA/i.test(location.href + ' ' + (document.title || '')),
          }));
          if (assigned?.ok && landed?.isHcfa) {
            editorNav = { ok: true, url: abs, via: 'location.assign', landed };
          } else {
            editorNav = await Promise.race([
              gotoWithBudget(session.page, abs, { timeout: 15000 }),
              new Promise((resolve) => {
                setTimeout(() => resolve({ ok: false, error: 'editor_nav_hard_timeout_18s' }), 18000);
              }),
            ]);
            editorNav.via = 'gotoWithBudget';
            editorNav.assignAttempt = { assigned, landed };
          }
        } catch (err) {
          editorNav = { ok: false, error: String(err?.message || err).slice(0, 160) };
        }
        interact.editorNav = { ok: editorNav.ok, url: abs, error: editorNav.error || null, via: editorNav.via || null, detail: editorNav };
        progress({ phase: 'claim_editor_landed', editorNav: interact.editorNav });
        await sleep(1200);
        try { await dismissSessionTakeover(session.page); } catch (_) { /* ignore */ }
      }

      dailySuperBill.interact = interact;
      await sleep(1500);

      const claimLinkOk = (interact?.attempts || []).some((a) => a.label === 'claim_link' && a.ok)
        || Boolean(interact?.editorNav?.ok);
      progress({ phase: 'claim_link', claimLinkOk, attempts: interact?.attempts || [], editorNav: interact?.editorNav || null });
      if (claimLinkOk) {
        try {
          dailySuperBill.claimEditor = await evaluateWithTimeout(session.page, () => {
            const visible = (el) => {
              if (!el) return false;
              const s = window.getComputedStyle(el);
              if (s.display === 'none' || s.visibility === 'hidden') return false;
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            };
            const url = location.href;
            const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
            const isEditor = /Invoice|HCFA|UB.?04|SuperBill|ClaimEdit|CreateClaim/i.test(url)
              || /hcfa|invoice|super bill|create claim/i.test(document.title || '')
              || /save\s*claim|submit\s*claim|print\s*hcfa|electronic\s*submit|send via edi/i.test(text);
            const attempts = [];
            if (!isEditor && !/Invoice|HCFA|Billing/i.test(url)) {
              return { isEditor: false, url, preview: text.slice(0, 400), attempts };
            }
            const scoreBtn = (t) => {
              let score = 0;
              // Tip 2026-07-15: Save alone left Sent Bills empty; EDI submit is the money click.
              if (/send\s*via\s*edi|electronic\s*submit|submit\s*(claim|edi)|transmit/i.test(t)) score += 120;
              if (/^save$/i.test(t) || /save\s*(claim|bill|hcfa|invoice)/i.test(t)) score += 100;
              if (/hcfa\s*entry|create\s*claim|file\s*claim|post\s*claim|post\s*payment/i.test(t)) score += 80;
              if (/send\s*fax|client\s*send/i.test(t)) score += 30;
              if (/cancel|close|back|delete|home|clients/i.test(t)) score -= 200;
              return score;
            };
            const ranked = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
              .filter(visible)
              .map((el) => {
                const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
                return { el, t, score: scoreBtn(t) };
              })
              .filter((x) => x.t && x.score > 0)
              .sort((a, b) => b.score - a.score);
            // Click Save first if present, then EDI (order matters on some ClientCare screens).
            const saveBtn = ranked.find((x) => /^save$/i.test(x.t) || /save\s*(claim|bill|hcfa|invoice)/i.test(x.t));
            const ediBtn = ranked.find((x) => /send\s*via\s*edi|electronic\s*submit|submit\s*(claim|edi)|transmit/i.test(x.t));
            if (saveBtn) {
              saveBtn.el.click();
              attempts.push({ label: 'editor_save', ok: true, text: saveBtn.t.slice(0, 40), score: saveBtn.score });
            }
            if (ediBtn && ediBtn !== saveBtn) {
              ediBtn.el.click();
              attempts.push({ label: 'editor_edi', ok: true, text: ediBtn.t.slice(0, 40), score: ediBtn.score });
            }
            if (!saveBtn && !ediBtn) {
              if (ranked[0]) {
                ranked[0].el.click();
                attempts.push({ label: 'editor_action', ok: true, text: ranked[0].t.slice(0, 40), score: ranked[0].score });
              } else {
                attempts.push({ label: 'editor_save', ok: false, error: 'no_save_button' });
              }
            }
            for (const name of ['SaveClaim', 'saveClaim', 'SubmitClaim', 'submitClaim', 'CreateClaim', 'createClaim', 'SendEDI', 'sendEDI']) {
              if (typeof window[name] !== 'function') continue;
              try {
                window[name]();
                attempts.push({ label: `helper:${name}`, ok: true });
                break;
              } catch (err) {
                attempts.push({ label: `helper:${name}`, ok: false, error: String(err?.message || err).slice(0, 100) });
              }
            }
            return {
              isEditor: true,
              url,
              title: document.title || null,
              attempts,
              preview: text.slice(0, 500),
              topButtons: ranked.slice(0, 8).map((x) => ({ text: x.t.slice(0, 40), score: x.score })),
            };
          }, undefined, 30000);
          await sleep(2000);
          // Second pass after Save paint — EDI button may appear late.
          try {
            const ediFollow = await evaluateWithTimeout(session.page, () => {
              const visible = (el) => {
                if (!el) return false;
                const s = window.getComputedStyle(el);
                if (s.display === 'none' || s.visibility === 'hidden') return false;
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
              };
              const ranked = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
                .filter(visible)
                .map((el) => {
                  const t = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
                  let score = 0;
                  if (/send\s*via\s*edi|electronic\s*submit|submit\s*(claim|edi)|transmit/i.test(t)) score += 120;
                  if (/hcfa\s*entry/i.test(t)) score += 70;
                  if (/cancel|close|back|home/i.test(t)) score -= 200;
                  return { el, t, score };
                })
                .filter((x) => x.score >= 70)
                .sort((a, b) => b.score - a.score);
              if (!ranked[0]) return { ok: false, error: 'no_edi_followup' };
              ranked[0].el.click();
              return { ok: true, text: ranked[0].t.slice(0, 40), score: ranked[0].score };
            }, undefined, 20000);
            dailySuperBill.claimEditor = {
              ...(dailySuperBill.claimEditor || {}),
              ediFollow,
            };
          } catch (err) {
            dailySuperBill.claimEditor = {
              ...(dailySuperBill.claimEditor || {}),
              ediFollow: { error: String(err?.message || err).slice(0, 120) },
            };
          }
          await sleep(4000);
        } catch (err) {
          dailySuperBill.claimEditor = { error: String(err?.message || err).slice(0, 160) };
        }
      }

      dailySuperBill.afterReport = await session.page.evaluate(() => ({
        url: location.href,
        preview: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700),
        rows: Array.from(document.querySelectorAll('table tr, .k-grid-content tr'))
          .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())
          .filter((t) => /59400|59409|claim|alvarado|denise|\$\d|invoice|hcfa/i.test(t))
          .slice(0, 12),
        claimLinks: Array.from(document.querySelectorAll('a, button'))
          .map((el) => (el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
          .filter((t) => /^(invoice|hcfa|ub-?04)$/i.test(t))
          .slice(0, 10),
      }));

      try {
        const billsNav = await gotoWithBudget(session.page, `${origin}/Billing/BillingListView`, {
          timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
        });
        if (billsNav.ok) {
          await sleep(800);
          try {
            await session.page.evaluate((needle) => {
              const datePrefer = [/this\s*month/i, /year\s*to\s*date/i, /this\s*week/i, /^today$/i];
              const dateNodes = Array.from(document.querySelectorAll('a, button, input[type="button"], label, span, li'));
              for (const re of datePrefer) {
                const dateBtn = dateNodes.find((el) => re.test((el.textContent || el.value || '').replace(/\s+/g, ' ').trim()));
                if (dateBtn) { dateBtn.click(); break; }
              }
              const nameInput = document.getElementById('searchTerm')
                || Array.from(document.querySelectorAll('input')).find((inp) => /searchTerm|name|patient|client|search/i.test(`${inp.id || ''} ${inp.name || ''} ${inp.placeholder || ''}`));
              if (nameInput) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (setter) setter.call(nameInput, needle);
                else nameInput.value = needle;
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.jQuery) window.jQuery(nameInput).val(needle).trigger('change');
              }
              if (typeof window.filterRecords === 'function') window.filterRecords();
              else {
                const go = document.getElementById('btnSearch');
                if (go) go.click();
              }
            }, wantName);
            await sleep(3500);
          } catch (_) { /* ignore */ }
          dailySuperBill.sentBillsProbe = await session.page.evaluate((needle) => {
            const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
            const n = String(needle || '').toLowerCase();
            const rows = Array.from(document.querySelectorAll('table tr, .k-grid-content tr'))
              .map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())
              .filter((t) => {
                if (!t || !n || !t.toLowerCase().includes(n)) return false;
                return /\bHCFA\b|\bUB\s*-?\s*04\b|\b\d{5,}\b/.test(t) && /\d{1,2}\/\d{1,2}\/\d{4}/.test(t);
              })
              .slice(0, 8);
            return {
              checked: true,
              noItems: /no items to display|no records|no data/i.test(text) && !rows.length,
              nameHit: Boolean(rows.length),
              claimSubmitted: rows.some((t) => /claim\s*submitted/i.test(t)),
              rows,
              preview: text.slice(0, 500),
            };
          }, wantName);
        } else {
          dailySuperBill.sentBillsProbe = { checked: false, error: billsNav.error };
        }
      } catch (err) {
        dailySuperBill.sentBillsProbe = { checked: false, error: String(err?.message || err).slice(0, 120) };
      }

      const sent = dailySuperBill.sentBillsProbe || {};
      const filed = Boolean(sent.nameHit) || (sent.checked && sent.noItems === false && !sent.error);
      return {
        ok: claimLinkOk,
        filed: Boolean(sent.nameHit),
        patientQuery: wantName,
        visitDate: reportDate,
        claimLinkOk,
        sentBillsProbe: sent,
        claimEditor: dailySuperBill.claimEditor || null,
        dailySuperBill,
        message: sent.nameHit
          ? `Sent Bills shows ${wantName}`
          : (claimLinkOk
            ? 'HCFA/Invoice clicked + editor Save attempted; Sent Bills name hit not yet proved'
            : 'Could not click Invoice/HCFA on SuperBillReport'),
        screenshots,
        url: session.page.url(),
      };
    } finally {
      // Tip: after Generate, Chromium can wedge so session.close never resolves —
      // that blocked stdout JSON until SIGKILL. Race close so child can exit.
      await Promise.race([
        session.close().catch(() => {}),
        sleep(1500),
      ]);
    }
  }

  /**
   * Open Charge Slip from a client billing chart (carries patient context better than cold ChargeSlip URL).
   */
  async function openChargeSlipFromBilling({
    billingHref,
    careType = 'Intrapartum Care',
    dryRun = true,
    pageTimeoutMs = 20000,
  } = {}) {
    if (!billingHref) return { ok: false, error: 'billingHref required' };
    const pregnancyId = String(billingHref).match(/\/Pregnancy\/Billing\/([^/?#]+)/i)?.[1] || null;
    const result = await login({ dryRun: false });
    const { session, screenshots } = result;
    try {
      const nav = await gotoWithBudget(session.page, billingHref, {
        timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
      });
      if (!nav.ok) return { ok: false, error: nav.error, screenshots };
      await sleep(1500);
      const billingTab = await session.page.$('a[href*="#tabs-billing"]');
      if (billingTab) {
        await billingTab.click().catch(() => {});
        await sleep(800);
      }

      // Prefer explicit pregnancyId ChargeSlip URL — nav "Billing Slip" drops context.
      const origin = new URL(session.currentUrl()).origin;
      const chargeUrl = pregnancyId
        ? `${origin}/Company/ChargeSlip?pregnancyId=${encodeURIComponent(pregnancyId)}`
        : `${origin}/Company/ChargeSlip`;
      const chargeNav = await gotoWithBudget(session.page, chargeUrl, {
        timeout: Math.max(8000, Number(pageTimeoutMs) || 20000),
      });
      if (!chargeNav.ok) return { ok: false, error: chargeNav.error, screenshots, pregnancyId };
      await sleep(3000);

      // Force hidden pregnancy/patient fields if present.
      if (pregnancyId) {
        await session.page.evaluate((id) => {
          for (const name of ['PregnancyId', 'PregnancyID', 'pregnancyId', 'PatientId', 'PatientID', 'ClientId', 'SelectedPregnancyId']) {
            const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
            if (!el) continue;
            el.value = id;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, pregnancyId);
        await sleep(1000);
      }

      // Wait briefly for ChargeSlipId options to hydrate beyond "None".
      for (let i = 0; i < 6; i += 1) {
        const ready = await session.page.evaluate(() => {
          const sel = document.getElementById('ChargeSlipId');
          const opts = Array.from(sel?.options || []).map((o) => (o.textContent || '').trim()).filter(Boolean);
          return { count: opts.length, opts: opts.slice(0, 20) };
        });
        if ((ready?.count || 0) > 1) break;
        await sleep(1000);
      }

      const chargeSlipType = await session.page.evaluate((wantType) => {
        const sel = document.getElementById('ChargeSlipId');
        if (!sel) return { set: false, reason: 'ChargeSlipId missing' };
        const want = String(wantType || 'Intrapartum Care').toLowerCase();
        const option = Array.from(sel.options || []).find((o) => (o.textContent || '').toLowerCase().includes(want))
          || Array.from(sel.options || []).find((o) => /intrapartum|postpartum|newborn|antepartum/i.test(o.textContent || ''));
        if (!option) {
          return {
            set: false,
            available: Array.from(sel.options || []).map((o) => (o.textContent || '').trim()),
          };
        }
        sel.value = option.value;
        Array.from(sel.options || []).forEach((o) => { o.selected = o === option; });
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        try { window.$(sel).trigger('change'); } catch (_) {}
        return { set: true, text: (option.textContent || '').trim(), value: option.value };
      }, careType);
      if (chargeSlipType?.set) await sleep(1500);

      // Try Daily Super bill if care-type options never hydrated.
      let dailySuperBill = { clicked: false };
      if (!chargeSlipType?.set) {
        dailySuperBill = await session.page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button, input[type="button"], a'))
            .find((el) => /daily super bill/i.test((el.textContent || el.value || '').trim()));
          if (!btn) return { clicked: false };
          btn.click();
          return { clicked: true };
        });
        if (dailySuperBill.clicked) await sleep(3000);
      }

      let saveResult = { attempted: false };
      if (!dryRun && (chargeSlipType?.set || dailySuperBill.clicked)) {
        saveResult = await session.page.evaluate(() => {
          const save = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'))
            .find((el) => /^save$/i.test((el.textContent || el.value || '').trim()));
          if (!save) return { attempted: false };
          save.click();
          return { attempted: true, label: 'Save' };
        });
        await sleep(2500);
      }

      const snapshot = await session.page.evaluate(() => {
        const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
        const patientLine = (text.match(/Patient:\s*([^\n]{0,80})/i) || [])[1] || '';
        const ageLine = (text.match(/Age:\s*([^\n]{0,40})/i) || [])[1] || '';
        const dobLine = (text.match(/DOB:\s*([^\n]{0,40})/i) || [])[1] || '';
        const patientSelected = Boolean(
          (patientLine && !/please select/i.test(patientLine) && patientLine.trim().length > 1)
          || (dobLine && /\d/.test(dobLine))
          || (ageLine && /\d/.test(ageLine))
        );
        const chargeOpts = Array.from(document.getElementById('ChargeSlipId')?.options || [])
          .map((o) => (o.textContent || '').trim())
          .filter(Boolean);
        return {
          patientSelected,
          patientLine: patientLine.slice(0, 80),
          ageLine: ageLine.slice(0, 40),
          dobLine: dobLine.slice(0, 40),
          chargeOpts,
          textPreview: text.slice(0, 1200),
        };
      });

      return {
        ok: true,
        billingHref,
        pregnancyId,
        chargeUrl,
        chargeSlipType,
        dailySuperBill,
        saveResult,
        dryRun: dryRun !== false,
        ...snapshot,
        url: session.page.url(),
        screenshots,
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  async function prepareClaimStatus({
    billingHref,
    clientBillingStatus = 'Claims Processing',
    billProviderType = 'CPM',
    dryRun = false,
  } = {}) {
    return repairBillingAccount({
      billingHref,
      updates: {
        client_billing_status: clientBillingStatus,
        bill_provider_type: billProviderType,
      },
      dryRun,
    });
  }

  return {
    getReadiness,
    getCredentials,
    listWorkflowTemplates: () => WORKFLOW_TEMPLATES,
    login,
    discoverBillingSurface,
    crawlSiteMap,
    inspectPage,
    buildBillingOverview,
    inspectBillingNotesTransport,
    inspectClientBillingAccount,
    scanClientBillingAccounts,
    scanBillingNotes,
    scanBirthActivity,
    mapChargeSlip,
    fileSuperBillClaim,
    openChargeSlipFromBilling,
    buildAccountRescueReport,
    buildFullAccountRescueReport,
    buildBacklogSummary,
    searchClientDirectory,
    extractClaimTables,
    repairBillingAccount,
    prepareClaimStatus,
    runClientcareVobFlow,
    /** Post a billing note to ClientCare. billingHref is the client billing page URL. */
    async addBillingNote(billingHref, noteText) {
      if (!billingHref || !noteText) return { ok: false, reason: 'billingHref and noteText required' };
      const result = await login({ dryRun: false });
      const { session } = result;
      try {
        const nav = await gotoWithBudget(session.page, billingHref, { timeout: 18000 });
        if (!nav.ok) return { ok: false, reason: nav.error || 'navigation failed' };
        const billingTab = await session.page.$('a[href*="#tabs-billing"]');
        if (billingTab) {
          await billingTab.click().catch(() => {});
          await sleep(1000);
        }
        return await addBillingNote(session.page, noteText);
      } finally {
        await session.close().catch(() => {});
      }
    },
  };
}
