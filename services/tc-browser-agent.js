/**
 * tc-browser-agent.js
 * Browser automation for TC workflows:
 *   - GLVAR MLS → TransactionDesk (via Clareity IAM SSO)
 *   - eXp Realty Okta → SkySlope (via Okta SSO)
 *
 * Deps: services/browser-agent.js, services/account-manager.js
 * Exports: createTCBrowserAgent(deps)
 */

import path from 'path';
import fs from 'fs/promises';
import { createSession } from './browser-agent.js';

const GLVAR_LOGIN_URL = 'https://glvar.clareityiam.net/idp/login';
const EXP_OKTA_URL   = 'https://exprealty.okta.com';
const SCREENSHOT_DIR = '/tmp/tc-screenshots';
const LOGIN_TIMEOUT_MS = 45_000;
const NAV_TIMEOUT_MS = 30_000;

// Nevada-standard contingency days from acceptance
const NEVADA_DEFAULTS = {
  inspection_contingency_days: 10,
  loan_contingency_days: 21,
  appraisal_contingency_days: 17,
};

export function createTCBrowserAgent({ accountManager, logger = console }) {
  async function ensureScreenshotDir() {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  }

  async function screenshotPath(label) {
    await ensureScreenshotDir();
    return path.join(SCREENSHOT_DIR, `${label}-${Date.now()}.png`);
  }

  /**
   * Retrieve GLVAR credentials from encrypted vault.
   */
  async function getGLVARCredentials() {
    const account = await accountManager.getAccount('glvar_mls', '232953');
    if (!account) throw new Error('GLVAR credentials not found in vault — store via POST /api/v1/accounts/store');
    return { username: account.username || account.emailUsed, password: account.password };
  }

  /**
   * Retrieve eXp Okta credentials from encrypted vault.
   */
  async function getExpCredentials() {
    const account = await accountManager.getAccount('exp_okta', 'adam.hopkins@exprealty.com');
    if (!account) throw new Error('eXp Okta credentials not found in vault');
    return { username: account.username || account.emailUsed, password: account.password };
  }

  /**
   * Log into eXp Realty via Okta SSO.
   * Returns open session — do NOT close before calling navigateToSkySlope.
   */
  async function loginToExpOkta(dryRun = false) {
    const credentials = await getExpCredentials();
    const session = await createSession();

    try {
      await session.navigate(EXP_OKTA_URL);
      const sp = await screenshotPath('exp-okta-login-page');
      await session.page.screenshot({ path: sp });
      logger.info?.({ screenshot: sp }, '[TC-BROWSER] eXp Okta login page loaded');

      if (dryRun) {
        return { session, ok: true, dryRun: true, screenshots: [sp] };
      }

      // Okta standard login form
      await session.fill('#okta-signin-username, input[name="identifier"], input[type="email"]', credentials.username);

      // Okta may show password on same screen or after clicking Next
      const nextBtn = await session.page.$('#okta-signin-submit, [data-type="save"]');
      if (nextBtn) {
        await nextBtn.click();
        await session.page.waitForTimeout(1500);
      }

      await session.fill('#okta-signin-password, input[name="credentials.passcode"], input[type="password"]', credentials.password);
      await session.click('#okta-signin-submit, [data-type="save"], button[type="submit"]');

      await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: LOGIN_TIMEOUT_MS }).catch(() => {});

      const url = session.page.url();
      const content = await session.page.content();

      if (/sign.?in|login|error|incorrect/i.test(content) && url.includes('okta.com')) {
        const failSp = await screenshotPath('exp-okta-login-failed');
        await session.page.screenshot({ path: failSp });
        await session.close();
        throw new Error(`eXp Okta login failed. Screenshot: ${failSp}`);
      }

      const successSp = await screenshotPath('exp-okta-login-success');
      await session.page.screenshot({ path: successSp });
      logger.info?.({ url, screenshot: successSp }, '[TC-BROWSER] eXp Okta login success');

      return { session, ok: true, screenshots: [sp, successSp] };
    } catch (err) {
      await session.close().catch(() => {});
      throw err;
    }
  }

  /**
   * After eXp Okta login, navigate to SkySlope.
   * Must use the same session returned by loginToExpOkta.
   */
  async function navigateToSkySlope(session) {
    const screenshots = [];

    // Try to find SkySlope tile/link on the Okta dashboard
    const skySlopeSelectors = [
      'a[href*="skyslope"]',
      '[data-se*="skyslope" i]',
      '.app-name',
    ];

    let clicked = false;
    for (const sel of skySlopeSelectors) {
      const el = await session.page.$(sel);
      if (el) {
        const text = await session.page.evaluate(e => e.textContent, el);
        if (!sel.includes('app-name') || /skyslope/i.test(text)) {
          await el.click();
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      // Text-based search across all links/buttons
      clicked = await session.page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, [role="link"]'));
        const el = els.find(e => /skyslope/i.test(e.textContent));
        if (el) { el.click(); return true; }
        return false;
      });
    }

    if (!clicked) {
      // Direct navigation as fallback (SkySlope accepts Okta tokens in cookies)
      await session.navigate('https://skyslope.com/sign-in');
    }

    await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS }).catch(() => {});

    const url = session.page.url();
    const sp = await screenshotPath('skyslope-loaded');
    await session.page.screenshot({ path: sp });
    screenshots.push(sp);

    logger.info?.({ url, screenshot: sp }, '[TC-BROWSER] SkySlope loaded');
    return { ok: true, url, screenshots };
  }

  /**
   * Log into GLVAR MLS via Clareity IAM.
   * Returns the open session (do NOT close before calling navigateToTransactionDesk).
   */
  async function loginToGLVAR(dryRun = false) {
    const credentials = await getGLVARCredentials();
    const session = await createSession();

    try {
      await session.navigate(GLVAR_LOGIN_URL);
      const sp = await screenshotPath('glvar-login-page');
      await session.page.screenshot({ path: sp, fullPage: false });
      logger.info?.({ screenshot: sp }, '[TC-BROWSER] GLVAR login page loaded');

      if (dryRun) {
        logger.info?.('[TC-BROWSER] dryRun=true — not submitting login');
        return { session, ok: true, dryRun: true, screenshots: [sp] };
      }

      // Clareity IAM standard selectors
      await session.fill('#username, input[name="username"], input[type="text"]', credentials.username);
      await session.fill('input[type="password"]', credentials.password);

      const submitSp = await screenshotPath('glvar-pre-submit');
      await session.page.screenshot({ path: submitSp });

      await session.click('button[type="submit"], input[type="submit"]');
      await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: LOGIN_TIMEOUT_MS }).catch(() => {});

      const url = session.page.url();
      const content = await session.page.content();

      if (url.includes('/idp/login') || /invalid|authentication failed|incorrect/i.test(content)) {
        const failSp = await screenshotPath('glvar-login-failed');
        await session.page.screenshot({ path: failSp });
        await session.close();
        throw new Error(`GLVAR login failed — check credentials. Screenshot: ${failSp}`);
      }

      const successSp = await screenshotPath('glvar-login-success');
      await session.page.screenshot({ path: successSp });
      logger.info?.({ url, screenshot: successSp }, '[TC-BROWSER] GLVAR login success');

      return { session, ok: true, screenshots: [sp, submitSp, successSp] };
    } catch (err) {
      await session.close().catch(() => {});
      throw err;
    }
  }

  /**
   * After GLVAR login, navigate to TransactionDesk via SSO.
   * Must use the same session returned by loginToGLVAR.
   */
  async function navigateToTransactionDesk(session) {
    // Look for TransactionDesk link in MLS nav
    const tdSelectors = [
      'a[href*="transactiondesk"]',
      'a[href*="ziplogix"]',
      'a[href*="tdnavigator"]',
      'a[href*="lonewolf"]',
    ];

    let clicked = false;
    for (const sel of tdSelectors) {
      const el = await session.page.$(sel);
      if (el) {
        await el.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Try text-based link search
      const linkFound = await session.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const td = links.find(l => /transactiondesk|transaction desk/i.test(l.textContent));
        if (td) { td.click(); return true; }
        return false;
      });
      clicked = linkFound;
    }

    if (!clicked) {
      const sp = await screenshotPath('glvar-no-td-link');
      await session.page.screenshot({ path: sp, fullPage: true });
      throw new Error(`TransactionDesk link not found on GLVAR portal. Screenshot: ${sp}`);
    }

    await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS }).catch(() => {});

    const url = session.page.url();
    const sp = await screenshotPath('transactiondesk-loaded');
    await session.page.screenshot({ path: sp });
    logger.info?.({ url, screenshot: sp }, '[TC-BROWSER] Navigated to TransactionDesk');

    return { ok: true, url, screenshots: [sp] };
  }

  /**
   * Create a new transaction in TransactionDesk.
   * Always screenshots every step — high uncertainty on first run.
   */
  async function createTransaction(session, txData, dryRun = false) {
    const screenshots = [];

    const sp0 = await screenshotPath('td-before-create');
    await session.page.screenshot({ path: sp0, fullPage: true });
    screenshots.push(sp0);

    if (dryRun) {
      logger.info?.('[TC-BROWSER] dryRun=true — not creating transaction');
      return { ok: true, dryRun: true, screenshots };
    }

    // Click "New Transaction" or "+" button
    const newTxSelectors = [
      'button[title*="New Transaction" i]',
      'a[title*="New Transaction" i]',
      'button:contains("New Transaction")',
      '.btn-new-transaction',
      '[data-action="new-transaction"]',
    ];

    let created = false;
    for (const sel of newTxSelectors) {
      try {
        await session.page.click(sel, { timeout: 3000 });
        created = true;
        break;
      } catch {}
    }

    if (!created) {
      // Text search fallback
      created = await session.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const btn = btns.find(b => /new\s+transaction|\+\s*transaction/i.test(b.textContent));
        if (btn) { btn.click(); return true; }
        return false;
      });
    }

    await session.page.waitForTimeout(2000);
    const sp1 = await screenshotPath('td-new-transaction-form');
    await session.page.screenshot({ path: sp1, fullPage: true });
    screenshots.push(sp1);

    if (!created) {
      throw new Error(`Could not find "New Transaction" button. Screenshot: ${sp1}`);
    }

    // Fill address field
    if (txData.address) {
      await session.fill('input[name*="address" i], input[placeholder*="address" i], #propertyAddress', txData.address).catch(() => {});
    }
    if (txData.mls_number) {
      await session.fill('input[name*="mls" i], input[placeholder*="mls" i], #mlsNumber', txData.mls_number).catch(() => {});
    }

    const sp2 = await screenshotPath('td-transaction-filled');
    await session.page.screenshot({ path: sp2, fullPage: true });
    screenshots.push(sp2);

    // Submit
    await session.click('button[type="submit"], input[type="submit"]').catch(() => {});
    await session.page.waitForTimeout(3000);

    const sp3 = await screenshotPath('td-transaction-created');
    await session.page.screenshot({ path: sp3, fullPage: true });
    screenshots.push(sp3);

    // Try to get the new transaction ID from URL or page
    const url = session.page.url();
    const tdIdMatch = url.match(/transaction[s]?\/(\d+)/i) || url.match(/id=(\d+)/i);
    const transactionDeskId = tdIdMatch?.[1] || null;

    logger.info?.({ transactionDeskId, screenshots }, '[TC-BROWSER] Transaction created in TransactionDesk');
    return { ok: true, transactionDeskId, screenshots };
  }

  /**
   * Upload a document to a transaction in TransactionDesk.
   */
  async function uploadDocument(session, transactionDeskId, filePath, docType) {
    const screenshots = [];

    // Navigate to the transaction
    await session.page.evaluate((id) => {
      const links = Array.from(document.querySelectorAll('a'));
      const tx = links.find(l => l.href.includes(id));
      if (tx) tx.click();
    }, transactionDeskId).catch(() => {});

    await session.page.waitForTimeout(2000);

    // Click Documents tab
    const docTab = await session.page.$('a[href*="document" i], button:contains("Documents"), [data-tab="documents"]');
    if (docTab) await docTab.click();
    await session.page.waitForTimeout(1500);

    const sp0 = await screenshotPath('td-documents-tab');
    await session.page.screenshot({ path: sp0 });
    screenshots.push(sp0);

    // Click upload button
    const uploadBtn = await session.page.$('input[type="file"]');
    if (!uploadBtn) {
      // Try clicking an "Upload" button first to reveal the file input
      await session.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const btn = btns.find(b => /upload/i.test(b.textContent));
        if (btn) btn.click();
      }).catch(() => {});
      await session.page.waitForTimeout(1000);
    }

    // Use file chooser
    const [fileChooser] = await Promise.all([
      session.page.waitForFileChooser({ timeout: 10000 }),
      session.page.click('input[type="file"], button[title*="upload" i]').catch(() =>
        session.page.evaluate(() => {
          const input = document.querySelector('input[type="file"]');
          if (input) input.click();
        })
      ),
    ]);

    await fileChooser.accept([filePath]);
    await session.page.waitForTimeout(3000);

    const sp1 = await screenshotPath('td-doc-uploaded');
    await session.page.screenshot({ path: sp1 });
    screenshots.push(sp1);

    logger.info?.({ filePath, docType, screenshots }, '[TC-BROWSER] Document uploaded');
    return { ok: true, screenshots };
  }

  /**
   * Scrape current transaction checklist/status from TransactionDesk.
   */
  async function getTransactionStatus(session, transactionDeskId) {
    const sp = await screenshotPath('td-status-scrape');
    await session.page.screenshot({ path: sp });

    const checklist = await session.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr, .checklist-item, .document-row'));
      return rows.map(row => ({
        name: row.querySelector('.doc-name, td:first-child, .name')?.textContent?.trim() || '',
        status: row.querySelector('.status, .doc-status, td:last-child')?.textContent?.trim() || '',
        required: row.classList.contains('required') || !!row.querySelector('.required'),
      })).filter(r => r.name);
    });

    const overallStatus = await session.page.evaluate(() => {
      return document.querySelector('.transaction-status, .status-badge, h2')?.textContent?.trim() || null;
    });

    return { ok: true, checklist, overallStatus, screenshot: sp };
  }

  return {
    loginToGLVAR,
    navigateToTransactionDesk,
    createTransaction,
    uploadDocument,
    getTransactionStatus,
    loginToExpOkta,
    navigateToSkySlope,
    NEVADA_DEFAULTS,
  };
}

export default createTCBrowserAgent;
