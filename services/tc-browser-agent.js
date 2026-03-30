/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
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
import { getExpOktaCredentialsFromEnv, getGLVARCredentialsFromEnv } from './credential-aliases.js';

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
    if (account?.password && (account.username || account.emailUsed)) {
      return { username: account.username || account.emailUsed, password: account.password };
    }
    const envCreds = getGLVARCredentialsFromEnv();
    if (envCreds.present) {
      return { username: envCreds.username, password: envCreds.password };
    }
    throw new Error('GLVAR credentials not found in vault or env aliases — store via POST /api/v1/accounts/store or set GLVAR_mls_Username/GLVAR_mls_Password');
  }

  /**
   * Retrieve eXp Okta credentials from encrypted vault.
   */
  async function getExpCredentials() {
    const account = await accountManager.getAccount('exp_okta', 'adam.hopkins@exprealty.com');
    if (account?.password && (account.username || account.emailUsed)) {
      return { username: account.username || account.emailUsed, password: account.password };
    }
    const envCreds = getExpOktaCredentialsFromEnv();
    if (envCreds.present) {
      return { username: envCreds.username, password: envCreds.password };
    }
    throw new Error('eXp Okta credentials not found in vault or env aliases');
  }

  /**
   * Log into eXp Realty via Okta SSO.
   * Returns open session — do NOT close before calling navigateToSkySlope.
   */
  async function loginToExpOkta(dryRun = false) {
    const credentials = await getExpCredentials();
    const session = await createSession();

    try {
      await session.navigate(getExpOktaCredentialsFromEnv().url || EXP_OKTA_URL);
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
   * Click GLVAR "Transaction Launch" (or similar) if present — often opens TransactionDesk SSO.
   */
  async function clickTransactionLaunchIfPresent(session) {
    const clicked = await session.page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]')
      );
      const el = candidates.find((e) => {
        const t = `${e.textContent || ''} ${e.getAttribute?.('value') || ''} ${e.getAttribute?.('title') || ''}`;
        return /transaction\s*launch|launch\s*transaction|open\s*transaction\s*desk|transaction\s*desk\s*launch|zipform\s*launch/i.test(
          t
        );
      });
      if (el) {
        el.click();
        return true;
      }
      return false;
    });
    if (clicked) {
      await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS }).catch(() => {});
      await session.page.waitForTimeout(2000);
    }
    const sp = await screenshotPath('glvar-after-transaction-launch');
    await session.page.screenshot({ path: sp, fullPage: true }).catch(() => {});
    return { clicked, url: session.page.url(), screenshot: sp };
  }

  function _urlLooksLikeTransactionDesk(url) {
    return /transactiondesk|ziplogix|zipform|lonewolf|tdnavigator/i.test(url || '');
  }

  /**
   * Prefer Transaction Launch on GLVAR; fall back to SSO link navigation.
   */
  async function ensureOnTransactionDesk(session) {
    const screenshots = [];
    const launch = await clickTransactionLaunchIfPresent(session);
    screenshots.push(launch.screenshot);
    let url = session.page.url();
    if (_urlLooksLikeTransactionDesk(url)) {
      return { ok: true, via: launch.clicked ? 'transaction_launch' : 'already_in_td', url, screenshots };
    }
    const nav = await navigateToTransactionDesk(session);
    screenshots.push(...(nav.screenshots || []));
    url = session.page.url();
    return { ok: true, via: 'portal_link', url, screenshots };
  }

  /**
   * Search TransactionDesk / Zipform for a property or file (e.g. "Mahogany") and open the first matching row.
   */
  async function transactionDeskSearchAndOpenTransaction(session, searchText) {
    const raw = String(searchText || '').trim();
    const token =
      raw.split(/[\s,]+/).find((t) => t.length >= 3) || raw || '';
    if (!token) throw new Error('address_search / search text is empty');

    const filled = await session.page.evaluate((text) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
      const searchInput =
        inputs.find((i) => {
          const ph = (i.placeholder || '').toLowerCase();
          const nm = (i.name || '').toLowerCase();
          const id = (i.id || '').toLowerCase();
          return /search|find|filter|address|property|transaction|listing|file/i.test(ph + nm + id);
        }) || inputs.find((i) => i.type === 'search');
      if (!searchInput) return false;
      searchInput.focus();
      searchInput.value = text;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, token);

    if (!filled) {
      const sp = await screenshotPath('td-search-input-missing');
      await session.page.screenshot({ path: sp, fullPage: true });
      throw new Error(`TransactionDesk search field not found. Screenshot: ${sp}`);
    }

    await session.page.keyboard.press('Enter');
    await session.page.waitForTimeout(2800);

    const opened = await session.page.evaluate((text) => {
      const needle = text.toLowerCase();
      const rows = Array.from(
        document.querySelectorAll('tr, [role="row"], li, .ag-row, [class*="result"], [class*="transaction"]')
      );
      for (const row of rows) {
        const t = (row.textContent || '').toLowerCase();
        if (t.includes(needle) && t.length < 8000) {
          row.click();
          return { ok: true, kind: 'row' };
        }
      }
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find((l) => (l.textContent || '').toLowerCase().includes(needle));
      if (link) {
        link.click();
        return { ok: true, kind: 'link' };
      }
      return { ok: false };
    }, token);

    if (!opened.ok) {
      const sp = await screenshotPath('td-no-match');
      await session.page.screenshot({ path: sp, fullPage: true });
      throw new Error(`No TransactionDesk row matched "${token}". Screenshot: ${sp}`);
    }

    await session.page.waitForTimeout(1500);
    await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS }).catch(() => {});

    const sp = await screenshotPath('td-transaction-opened');
    await session.page.screenshot({ path: sp, fullPage: true });
    return { ok: true, token, screenshot: sp };
  }

  async function configurePuppeteerDownloads(session, dir) {
    await fs.mkdir(dir, { recursive: true });
    const page = session.page;
    const client =
      typeof page.createCDPSession === 'function'
        ? await page.createCDPSession()
        : await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
  }

  async function waitForNewDownload(dir, beforeNames, timeoutMs = 120000) {
    const before = beforeNames instanceof Set ? beforeNames : new Set(beforeNames);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const names = await fs.readdir(dir).catch(() => []);
      const ready = names.filter((f) => !before.has(f) && !f.endsWith('.crdownload'));
      if (ready.length) {
        const candidate = path.join(dir, ready[0]);
        try {
          const st = await fs.stat(candidate);
          if (st.size > 80) return candidate;
        } catch {
          /* keep waiting */
        }
      }
      await new Promise((r) => setTimeout(r, 450));
    }
    throw new Error(`No new file appeared in ${dir} within ${timeoutMs}ms`);
  }

  /**
   * Find a listing-agreement document in the current TD file and download it (PDF/DOC).
   * Uses Chrome download behavior + heuristic row/link matching.
   */
  async function downloadExecutedListingAgreementFromTD(session, { downloadDir, filenameHints } = {}) {
    const hints = filenameHints?.length ? filenameHints : ['listing', 'agreement'];
    const dir = downloadDir || path.join(SCREENSHOT_DIR, `td-download-${Date.now()}`);
    await configurePuppeteerDownloads(session, dir);
    const before = new Set(await fs.readdir(dir).catch(() => []));

    const pick = await session.page.evaluate((hintList) => {
      const hintRe = new RegExp(hintList.join('|'), 'i');
      const rows = Array.from(
        document.querySelectorAll('tr, [role="row"], .document-row, li, [class*="Document"], [class*="document"]')
      );
      const scored = [];
      for (const row of rows) {
        const t = row.textContent || '';
        if (!hintRe.test(t)) continue;
        let score = 10;
        if (/listing/i.test(t)) score += 5;
        if (/agreement/i.test(t)) score += 5;
        if (/executed|fully\s*executed|signed/i.test(t)) score += 8;
        if (/draft/i.test(t)) score -= 6;
        scored.push({ row, score, text: t.slice(0, 200) });
      }
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (!best || best.score < 8) return { ok: false, reason: 'no_row' };

      const row = best.row;
      const dl =
        row.querySelector('a[download], a[href*="download" i], a[href*=".pdf" i]') ||
        row.querySelector('button[title*="download" i], [aria-label*="download" i]');
      if (dl) {
        dl.click();
        return { ok: true, via: 'control', preview: best.text };
      }
      row.click();
      return { ok: true, via: 'row_click', preview: best.text };
    }, hints);

    if (!pick.ok) {
      const sp = await screenshotPath('td-listing-doc-not-found');
      await session.page.screenshot({ path: sp, fullPage: true });
      throw new Error(
        `Could not find listing agreement document row (hints: ${hints.join(', ')}). Screenshot: ${sp}`
      );
    }

    const filePath = await waitForNewDownload(dir, before, 120000);
    logger.info?.({ filePath, pick }, '[TC-BROWSER] Listing agreement downloaded from TransactionDesk');
    return { ok: true, filePath, pick, downloadDir: dir };
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

  /**
   * After eXp Okta login, navigate to BoldTrail via the Okta dashboard tile.
   * Must use the same session returned by loginToExpOkta.
   * BoldTrail and SkySlope are both on the eXp Okta dashboard.
   */
  async function navigateToBoldTrail(session) {
    const screenshots = [];

    const btSelectors = [
      'a[href*="boldtrail"]',
      'a[href*="kvcore"]',
      '[data-se*="boldtrail" i]',
      '[data-se*="kvcore" i]',
    ];

    let clicked = false;
    for (const sel of btSelectors) {
      const el = await session.page.$(sel);
      if (el) {
        await el.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      clicked = await session.page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, [role="link"]'));
        const el = els.find(e => /boldtrail|kvcore/i.test(e.textContent));
        if (el) { el.click(); return true; }
        return false;
      });
    }

    if (!clicked) {
      const sp = await screenshotPath('okta-no-boldtrail-tile');
      await session.page.screenshot({ path: sp, fullPage: true });
      throw new Error(`BoldTrail tile not found on eXp Okta dashboard. Screenshot: ${sp}`);
    }

    await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS }).catch(() => {});

    const url = session.page.url();
    const sp = await screenshotPath('boldtrail-loaded');
    await session.page.screenshot({ path: sp });
    screenshots.push(sp);

    logger.info?.({ url, screenshot: sp }, '[TC-BROWSER] Navigated to BoldTrail via eXp Okta');
    return { ok: true, url, screenshots };
  }

  /**
   * After GLVAR login, navigate to the MLS search portal (FlexMLS or similar).
   * Must use the same session returned by loginToGLVAR.
   */
  async function navigateToMLS(session) {
    const mlsSelectors = [
      'a[href*="flexmls"]',
      'a[href*="paragonrels"]',
      'a[href*="matrix"]',
      'a[href*="/mls"]',
    ];

    let clicked = false;
    for (const sel of mlsSelectors) {
      const el = await session.page.$(sel);
      if (el) { await el.click(); clicked = true; break; }
    }

    if (!clicked) {
      clicked = await session.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const el = links.find(l => /\bMLS\b|flexmls|paragon|matrix/i.test(l.textContent));
        if (el) { el.click(); return true; }
        return false;
      });
    }

    await session.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS }).catch(() => {});

    const url = session.page.url();
    const sp = await screenshotPath('glvar-mls-loaded');
    await session.page.screenshot({ path: sp });
    logger.info?.({ url, screenshot: sp }, '[TC-BROWSER] Navigated to MLS');
    return { ok: true, url, screenshots: [sp] };
  }

  /**
   * After GLVAR login, navigate to the member/billing page and scrape dues info.
   * Returns: { dueItems: [{ description, amount, dueDate, status }], screenshots }
   */
  async function checkGLVARDues(session) {
    const screenshots = [];

    // Try billing/dues/account links in the portal
    const duesSelectors = [
      'a[href*="billing"]',
      'a[href*="dues"]',
      'a[href*="invoice"]',
      'a[href*="payment"]',
      'a[href*="account"]',
    ];

    let clicked = false;
    for (const sel of duesSelectors) {
      const el = await session.page.$(sel);
      if (el) { await el.click(); clicked = true; break; }
    }

    if (!clicked) {
      clicked = await session.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const el = links.find(l => /dues|billing|invoice|payment|account/i.test(l.textContent));
        if (el) { el.click(); return true; }
        return false;
      });
    }

    await session.page.waitForTimeout(2000);

    const sp = await screenshotPath('glvar-dues-page');
    await session.page.screenshot({ path: sp, fullPage: true });
    screenshots.push(sp);

    // Scrape any visible due amounts and dates
    const dueItems = await session.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr, .invoice-row, .billing-row, .dues-item'));
      return rows.map(row => {
        const text = row.textContent || '';
        const amountMatch = text.match(/\$[\d,]+\.?\d{0,2}/);
        const dateMatch = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4}\b/i);
        if (!amountMatch && !dateMatch) return null;
        return {
          description: row.querySelector('td:first-child, .description, .name')?.textContent?.trim() || text.substring(0, 80).trim(),
          amount: amountMatch?.[0] || null,
          dueDate: dateMatch?.[0] || null,
          status: row.querySelector('.status, .paid, .unpaid, td:last-child')?.textContent?.trim() || null,
        };
      }).filter(Boolean);
    });

    // Also grab page-level summary text (sometimes dues shown in a header)
    const summaryText = await session.page.evaluate(() => {
      const candidates = ['h1','h2','h3','.balance','.amount-due','.total-due'];
      return candidates.flatMap(sel => Array.from(document.querySelectorAll(sel)))
        .map(el => el.textContent?.trim())
        .filter(t => t && /\$|due|balance|owed/i.test(t))
        .slice(0, 5);
    });

    const url = session.page.url();
    logger.info?.({ url, dueItems, screenshots }, '[TC-BROWSER] GLVAR dues scraped');
    return { ok: true, url, dueItems, summaryText, screenshots };
  }

  return {
    loginToGLVAR,
    navigateToTransactionDesk,
    ensureOnTransactionDesk,
    clickTransactionLaunchIfPresent,
    transactionDeskSearchAndOpenTransaction,
    downloadExecutedListingAgreementFromTD,
    navigateToMLS,
    checkGLVARDues,
    navigateToBoldTrail,
    createTransaction,
    uploadDocument,
    getTransactionStatus,
    loginToExpOkta,
    navigateToSkySlope,
    NEVADA_DEFAULTS,
  };
}

export default createTCBrowserAgent;
