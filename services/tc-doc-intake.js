/**
 * tc-doc-intake.js
 * Finds executed agreements in Adam's email inbox and routes documents
 * to SkySlope and/or TransactionDesk.
 *
 * Two intake paths:
 *   1. Email scan — IMAP search for executed RPA + attachments
 *   2. Manual upload — file posted directly (scanned paper docs, photos)
 *
 * Both paths end at: SkySlope upload via eXp Okta SSO browser session.
 *
 * Deps: imapflow, tc-browser-agent.js
 * Exports: createTCDocIntake(deps)
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 */

import { ImapFlow } from 'imapflow';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const DOWNLOAD_DIR = '/tmp/tc-doc-intake';

// Subject/body patterns that indicate an executed purchase agreement
const EXECUTED_RPA_PATTERNS = [
  /fully\s+executed/i,
  /executed\s+(RPA|purchase\s+agreement|contract)/i,
  /signed.*purchase\s+agreement/i,
  /purchase\s+agreement.*signed/i,
  /counter\s+offer.*accepted/i,
  /accepted.*offer/i,
  /binding\s+agreement/i,
  /RPA.*attached/i,
];

const LISTING_AGREEMENT_PATTERNS = [
  /listing\s+agreement/i,
  /exclusive.*listing/i,
  /listing.*contract/i,
];

const DOC_TYPE_PATTERNS = [
  { type: 'Executed RPA',        patterns: EXECUTED_RPA_PATTERNS },
  { type: 'Listing Agreement',   patterns: LISTING_AGREEMENT_PATTERNS },
  { type: 'Counter Offer',       patterns: [/counter\s+offer/i] },
  { type: 'Addendum',            patterns: [/addendum/i] },
  { type: 'Disclosure',          patterns: [/disclosure/i, /SPDS/i, /seller.*disclosure/i] },
  { type: 'Earnest Money',       patterns: [/earnest\s+money/i, /EMD/i] },
  { type: 'Inspection Report',   patterns: [/inspection\s+report/i] },
  { type: 'Loan Approval',       patterns: [/loan\s+approval/i, /pre.?approval/i] },
];

function classifyDoc(subject = '', filename = '') {
  const text = `${subject} ${filename}`;
  for (const { type, patterns } of DOC_TYPE_PATTERNS) {
    if (patterns.some(re => re.test(text))) return type;
  }
  return 'Transaction Document';
}

function isRelevantAttachment(filename = '') {
  return /\.(pdf|doc|docx|jpg|jpeg|png|tiff?|heic)$/i.test(filename);
}

export function createTCDocIntake({ pool, tcBrowser, accountManager, logger = console }) {

  async function ensureDownloadDir() {
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
  }

  function getImapConfig() {
    // Prefer env vars; fall back to vault lookup at call time
    return {
      host:   process.env.IMAP_HOST   || 'imap.gmail.com',
      port:   parseInt(process.env.IMAP_PORT || '993'),
      secure: true,
      auth: {
        user: process.env.IMAP_USER || 'adam@hopkinsgroup.org',
        pass: process.env.IMAP_PASS,
      },
      logger: false,
      tls: { rejectUnauthorized: false },
    };
  }

  // ── Email search ──────────────────────────────────────────────────────────

  /**
   * Search inbox for executed agreements within the last N days.
   * Downloads all PDF/image attachments and returns local file paths.
   */
  async function findExecutedAgreements({ days = 90, searchAll = false } = {}) {
    await ensureDownloadDir();

    // Try to get IMAP password from vault if not in env
    let imapPass = process.env.IMAP_PASS;
    if (!imapPass && accountManager) {
      const account = await accountManager.getAccount('email_imap', 'adam@hopkinsgroup.org').catch(() => null);
      imapPass = account?.password;
    }
    if (!imapPass) throw new Error('IMAP_PASS not set and not found in vault. Add to Railway env vars or store via /api/v1/accounts/store');

    const cfg = getImapConfig();
    cfg.auth.pass = imapPass;

    const client = new ImapFlow(cfg);
    const found = [];

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      const since = searchAll ? new Date('2020-01-01') : new Date(Date.now() - days * 86_400_000);

      logger.info?.({ since, host: cfg.host }, '[TC-INTAKE] Searching inbox for executed agreements');

      for await (const msg of client.fetch({ since }, { envelope: true, bodyStructure: true, source: true })) {
        const subject = msg.envelope?.subject || '';
        const from    = msg.envelope?.from?.[0]?.address || '';
        const date    = msg.envelope?.date || new Date();

        // Check if this looks like an executed agreement
        const isRPA     = EXECUTED_RPA_PATTERNS.some(re => re.test(subject));
        const isListing = LISTING_AGREEMENT_PATTERNS.some(re => re.test(subject));
        if (!isRPA && !isListing && !searchAll) continue;

        // Walk MIME parts for attachments
        const attachments = extractAttachmentParts(msg.bodyStructure);
        if (!attachments.length && !searchAll) continue;

        logger.info?.({ subject, from, attachmentCount: attachments.length }, '[TC-INTAKE] Found relevant email');

        // Download each attachment
        const downloadedFiles = [];
        for (const part of attachments) {
          if (!isRelevantAttachment(part.filename)) continue;
          try {
            const safeName = part.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = path.join(DOWNLOAD_DIR, `${msg.uid}_${safeName}`);
            const partData = await client.download(msg.seq, part.part);
            const chunks = [];
            for await (const chunk of partData.content) chunks.push(chunk);
            await fs.writeFile(filePath, Buffer.concat(chunks));
            downloadedFiles.push({
              filePath,
              filename: part.filename,
              docType: classifyDoc(subject, part.filename),
              size: Buffer.concat(chunks).length,
            });
            logger.info?.({ filePath, docType: classifyDoc(subject, part.filename) }, '[TC-INTAKE] Attachment saved');
          } catch (err) {
            logger.warn?.({ err: err.message, file: part.filename }, '[TC-INTAKE] Attachment download failed');
          }
        }

        found.push({
          uid:         String(msg.uid),
          subject,
          from,
          date,
          isRPA,
          isListing,
          files:       downloadedFiles,
        });
      }

      await client.logout();
    } catch (err) {
      logger.error?.({ err: err.message }, '[TC-INTAKE] IMAP search failed');
      throw err;
    }

    logger.info?.({ found: found.length }, '[TC-INTAKE] Email search complete');
    return found;
  }

  function extractAttachmentParts(structure, parts = [], partNum = '') {
    if (!structure) return parts;
    if (structure.childNodes?.length) {
      structure.childNodes.forEach((child, i) => {
        extractAttachmentParts(child, parts, partNum ? `${partNum}.${i + 1}` : `${i + 1}`);
      });
    } else if (structure.disposition === 'attachment' || structure.filename) {
      parts.push({ part: partNum || '1', filename: structure.filename || `attachment_${partNum}` });
    }
    return parts;
  }

  // ── SkySlope upload ───────────────────────────────────────────────────────

  /**
   * Upload a list of local files to SkySlope via eXp Okta SSO.
   * Finds or creates the transaction in SkySlope by address.
   */
  async function uploadToSkySlope(files, { address, transactionName } = {}) {
    const screenshots = [];
    const uploaded = [];
    const failed = [];

    const loginResult = await tcBrowser.loginToExpOkta(false);
    const { session } = loginResult;
    screenshots.push(...(loginResult.screenshots || []));

    try {
      // Navigate to SkySlope
      const navResult = await tcBrowser.navigateToSkySlope(session);
      screenshots.push(...(navResult.screenshots || []));

      // Find or create the transaction in SkySlope
      await _findOrCreateSkySllopeTransaction(session, address || transactionName, screenshots);

      // Upload each file
      for (const file of files) {
        try {
          const result = await _uploadFileToSkySlope(session, file.filePath, file.docType || 'Transaction Document');
          uploaded.push({ ...file, ...result });
          logger.info?.({ file: file.filename, docType: file.docType }, '[TC-INTAKE] Uploaded to SkySlope');
        } catch (err) {
          failed.push({ ...file, error: err.message });
          logger.warn?.({ err: err.message, file: file.filename }, '[TC-INTAKE] SkySlope upload failed');
        }
      }
    } finally {
      await session.close?.().catch(() => {});
    }

    return { ok: true, uploaded: uploaded.length, failed: failed.length, uploaded, failed, screenshots };
  }

  async function _findOrCreateSkySllopeTransaction(session, address, screenshots) {
    // Try to find existing transaction by address in SkySlope search
    const sp0 = await screenshotPath('skyslope-pre-search');
    await session.page.screenshot({ path: sp0, fullPage: true });
    screenshots.push(sp0);

    if (address) {
      // Try search box
      const searched = await session.page.evaluate((addr) => {
        const input = document.querySelector('input[placeholder*="search" i], input[type="search"], #searchInput, .search-input');
        if (input) { input.value = addr; input.dispatchEvent(new Event('input', { bubbles: true })); return true; }
        return false;
      }, address);

      if (searched) {
        await session.page.waitForTimeout(2000);
        // Click first result if found
        await session.page.evaluate((addr) => {
          const items = Array.from(document.querySelectorAll('[class*="transaction"], [class*="result"], li, tr'));
          const match = items.find(el => el.textContent?.includes(addr.split(',')[0]));
          if (match) { match.click(); return true; }
          return false;
        }, address);
        await session.page.waitForTimeout(1500);
      }
    }

    // If no transaction found, click "New Transaction" or "Add Transaction"
    const hasTransaction = await session.page.evaluate(() => {
      return !!document.querySelector('[class*="transaction-detail"], [class*="file-detail"], [class*="checklist"]');
    });

    if (!hasTransaction) {
      await session.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const btn = btns.find(b => /new\s+transaction|add\s+transaction|\+\s*transaction/i.test(b.textContent));
        if (btn) btn.click();
      });
      await session.page.waitForTimeout(2000);

      // Fill address if form appeared
      if (address) {
        await session.page.evaluate((addr) => {
          const input = document.querySelector('input[name*="address" i], input[placeholder*="address" i], input[placeholder*="property" i]');
          if (input) { input.value = addr; input.dispatchEvent(new Event('input', { bubbles: true })); }
        }, address);
      }
    }

    const sp1 = await screenshotPath('skyslope-transaction');
    await session.page.screenshot({ path: sp1, fullPage: true });
    screenshots.push(sp1);
  }

  async function _uploadFileToSkySlope(session, filePath, docType) {
    // Navigate to Documents section
    await session.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, [role="tab"]'));
      const docTab = links.find(l => /document|files|checklist/i.test(l.textContent));
      if (docTab) docTab.click();
    });
    await session.page.waitForTimeout(1500);

    // Trigger upload
    const [fileChooser] = await Promise.all([
      session.page.waitForFileChooser({ timeout: 15000 }),
      session.page.evaluate(() => {
        // Try clicking upload button first
        const btns = Array.from(document.querySelectorAll('button, a, label'));
        const upBtn = btns.find(b => /upload|add\s+doc|attach/i.test(b.textContent));
        if (upBtn) { upBtn.click(); return; }
        // Fall back to file input
        const input = document.querySelector('input[type="file"]');
        if (input) input.click();
      }),
    ]);

    await fileChooser.accept([filePath]);
    await session.page.waitForTimeout(3000);

    // Try to set document type label
    await session.page.evaluate((type) => {
      const inputs = Array.from(document.querySelectorAll('input[placeholder*="name" i], input[placeholder*="type" i], select[name*="type" i]'));
      if (inputs[0]) { inputs[0].value = type; inputs[0].dispatchEvent(new Event('input', { bubbles: true })); }
    }, docType);

    // Save / confirm
    await session.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const save = btns.find(b => /save|upload|submit|done|confirm/i.test(b.textContent));
      if (save) save.click();
    });
    await session.page.waitForTimeout(2000);

    const sp = await screenshotPath(`skyslope-uploaded-${path.basename(filePath)}`);
    await session.page.screenshot({ path: sp });
    return { ok: true, screenshot: sp };
  }

  async function screenshotPath(label) {
    await fs.mkdir('/tmp/tc-screenshots', { recursive: true });
    return path.join('/tmp/tc-screenshots', `${label}-${Date.now()}.png`);
  }

  // ── Full auto-intake run ──────────────────────────────────────────────────

  /**
   * Full flow: search email → find executed RPA → upload all docs to SkySlope.
   * This is the "prove it works" test run.
   */
  async function runFullIntake({ days = 90, address, dryRun = false } = {}) {
    logger.info?.({ days, address, dryRun }, '[TC-INTAKE] Starting full intake run');

    // Step 1: Find emails
    const emails = await findExecutedAgreements({ days, searchAll: !address });
    if (!emails.length) {
      return { ok: false, message: 'No executed agreements found in inbox', searched: true };
    }

    // Collect all attachment files
    const allFiles = emails.flatMap(e => e.files);
    const rpas = emails.filter(e => e.isRPA);
    const listings = emails.filter(e => e.isListing);

    logger.info?.({
      emails: emails.length, files: allFiles.length,
      rpas: rpas.length, listings: listings.length,
    }, '[TC-INTAKE] Email search results');

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        message: `Found ${emails.length} relevant emails with ${allFiles.length} attachments. Set dryRun=false to upload to SkySlope.`,
        emails: emails.map(e => ({ subject: e.subject, from: e.from, files: e.files.map(f => ({ filename: f.filename, docType: f.docType })) })),
      };
    }

    if (!allFiles.length) {
      return { ok: false, message: 'Found emails but no downloadable attachments', emails };
    }

    // Step 2: Upload to SkySlope
    const uploadResult = await uploadToSkySlope(allFiles, { address });

    // Step 3: Store in DB
    for (const email of emails) {
      if (email.isRPA && email.files.length) {
        await pool.query(
          `INSERT INTO email_triage_log
             (uid, received_at, from_address, subject, category, action_required, actioned_at, notes)
           VALUES ($1,$2,$3,$4,'tc_contract',true,NOW(),'Processed by TC intake — uploaded to SkySlope')
           ON CONFLICT (uid) DO UPDATE SET actioned_at=NOW(), notes='Uploaded to SkySlope'`,
          [email.uid, email.date, email.from, email.subject]
        ).catch(() => {});
      }
    }

    return {
      ok: true,
      emailsFound: emails.length,
      filesFound:  allFiles.length,
      rpasFound:   rpas.length,
      listingsFound: listings.length,
      upload: uploadResult,
    };
  }

  return { findExecutedAgreements, uploadToSkySlope, runFullIntake };
}
