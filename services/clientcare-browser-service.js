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
      tables,
      textPreview: (document.body.innerText || '').trim().slice(0, 3000),
    };
  });
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
    extractClaimTables,
  };
}
