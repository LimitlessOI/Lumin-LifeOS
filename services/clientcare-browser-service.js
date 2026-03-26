/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
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

async function gotoWithBudget(page, href, { timeout = 20000 } = {}) {
  try {
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout });
    await sleep(750);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
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
      text: (el.textContent || '').trim(),
      href: el.href || '',
    }));
    const candidates = links.filter((item) => /billing|claim|claims|invoice|insurance|ar\b|accounts receivable|denial|rejection|payment|era|eob/i.test(`${item.text} ${item.href}`)).slice(0, 20);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map((el) => (el.textContent || '').trim()).filter(Boolean).slice(0, 20);
    const tables = Array.from(document.querySelectorAll('table')).slice(0, 5).map((table) =>
      Array.from(table.querySelectorAll('tr')).slice(0, 20).map((row) =>
        Array.from(row.querySelectorAll('th,td')).map((cell) => (cell.textContent || '').trim())
      )
    );
    return {
      url: location.href,
      title: document.title,
      headings,
      candidateLinks: candidates,
      allLinks: links.slice(0, 100),
      tables,
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
  }, Math.max(1, Math.min(Number(limit) || 10, 25)));
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

export function createClientCareBrowserService({ env = process.env, logger = console, syncService = null } = {}) {
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
      notes: [
        'Do not store ClientCare credentials in code or docs.',
        'Use Railway secrets or the encrypted account vault only if browser automation is confirmed necessary.',
        'Selectors and automation steps should be finalized only after a live walkthrough of the ClientCare billing screens.',
      ],
    };
  }

  function getCredentials() {
    if (!env.CLIENTCARE_BASE_URL || !env.CLIENTCARE_USERNAME || !env.CLIENTCARE_PASSWORD) {
      throw new Error('ClientCare browser credentials are not fully configured');
    }
    return {
      baseUrl: env.CLIENTCARE_BASE_URL,
      username: env.CLIENTCARE_USERNAME,
      password: env.CLIENTCARE_PASSWORD,
      mfaMode: env.CLIENTCARE_MFA_MODE || null,
      mfaSecret: env.CLIENTCARE_MFA_SECRET || null,
    };
  }

  async function login({ dryRun = false } = {}) {
    const credentials = getCredentials();
    const session = await createSession({ logger });
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

      await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
      await sleep(1500);

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

  async function scanClientBillingAccounts({ limit = 10, pageTimeoutMs = 15000 } = {}) {
    const result = await login({ dryRun: false });
    const { session } = result;
    try {
      const directoryNav = await gotoWithBudget(session.page, new URL('/Pregnancy?donotRedirect=Y', session.currentUrl()).toString(), {
        timeout: Math.max(5000, Number(pageTimeoutMs) || 15000),
      });
      if (!directoryNav.ok) {
        return { ok: false, error: directoryNav.error, accounts: [] };
      }

      const clients = await extractClientDirectory(session.page, limit);
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
        accounts.push({
          ...client,
          ok: true,
          currentUrl: pageSummary.url,
          billingFieldCount: billingFields.length,
          billingFields,
          preview: (pageSummary.textPreview || '').slice(0, 700),
        });
      }

      return {
        ok: true,
        totalScanned: accounts.length,
        accounts,
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

  return {
    getReadiness,
    getCredentials,
    listWorkflowTemplates: () => WORKFLOW_TEMPLATES,
    login,
    discoverBillingSurface,
    inspectPage,
    buildBillingOverview,
    inspectClientBillingAccount,
    scanClientBillingAccounts,
    extractClaimTables,
  };
}
