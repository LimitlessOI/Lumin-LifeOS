/**
 * SYNOPSIS: Exports createTcEmailScanAndUpload — services/tc-doc-intake.js.
 */
import { ImapFlow } from 'imapflow';
import fs from 'fs/promises';
import path from 'path';
import { resolveTCImapConfig } from './tc-imap-config.js';
import { createTCDocumentValidator } from './tc-document-validator.js';

const DOWNLOAD_DIR = '/tmp/tc-doc-intake';

const EXECUTED_RPA_PATTERNS = [
  /fully\s+executed/i,
  /executed\s+(RPA|purchase\s+agreement|contract)/i,
  /signed.purchase\s+agreement/i,
  /purchase\s+agreement.signed/i,
  /counter\s+offer.accepted/i,
  /accepted.offer/i,
  /binding\s+agreement/i,
  /RPA.ALTER TABLEtached/i,
];

const LISTING_AGREEMENT_PATTERNS = [
  /listing\s+agreement/i,
  /exclusive.listing/i,
  /listing.contract/i,
];

const DOC_TYPE_PATTERNS = [
  { type: 'Executed RPA',        patterns: EXECUTED_RPA_PATTERNS },
  { type: 'Listing Agreement',   patterns: LISTING_AGREEMENT_PATTERNS },
  { type: 'Counter Offer',       patterns: [/counter\s+offer/i] },
  { type: 'Addendum',            patterns: [/addendum/i] },
  { type: 'Disclosure',          patterns: [/disclosure/i, /SPDS/i, /seller.disclosure/i] },
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

export function createTcEmailScanAndUpload({ pool, tcBrowser, accountManager, logger = console }) {
  const documentValidator = createTCDocumentValidator({ logger });

  async function ensureDownloadDir() {
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
  }

  function getImapConfig() {
    return resolveTCImapConfig({ accountManager, logger });
  }

  async function findAndProcessEmails({ userId, days = 90, searchAll = false, dryRun = false } = {}) {
    if (!userId) {
      const err = new Error('user_id_required');
      err.status = 400;
      throw err;
    }

    await ensureDownloadDir();

    const cfg = await getImapConfig();
    if (!cfg.auth.pass) {
      throw new Error('IMAP_PASS not set and not found in vault. Add to Railway env vars or store via /api/v1/accounts/store');
    }

    const client = new ImapFlow(cfg);
    const foundEmails = [];

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      const since = searchAll ? new Date('2020-01-01') : new Date(Date.now() - days * 86_400_000);

      logger.info?.({ since, host: cfg.host, userId }, '[TC-EMAIL-SCAN] Searching inbox for relevant documents');

      for await (const msg of client.fetch({ since }, { envelope: true, bodyStructure: true, source: true })) {
        const subject = msg.envelope?.subject || '';
        const from    = msg.envelope?.from?.[0]?.address || '';
        const date    = msg.envelope?.date || new Date();

        const isRPA     = EXECUTED_RPA_PATTERNS.some(re => re.test(subject));
        const isListing = LISTING_AGREEMENT_PATTERNS.some(re => re.test(subject));
        const isRelevantSubject = isRPA || isListing || EXECUTED_RPA_PATTERNS.some(re => re.test(subject)) || LISTING_AGREEMENT_PATTERNS.some(re => re.test(subject));

        if (!isRelevantSubject && !searchAll) continue;

        const attachments = extractAttachmentParts(msg.bodyStructure);
        if (!attachments.length && !searchAll) continue;

        logger.info?.({ subject, from, attachmentCount: attachments.length }, '[TC-EMAIL-SCAN] Found potentially relevant email');

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
            logger.info?.({ filePath, docType: classifyDoc(subject, part.filename) }, '[TC-EMAIL-SCAN] Attachment saved');
          } catch (err) {
            logger.warn?.({ err: err.message, file: part.filename }, '[TC-EMAIL-SCAN] Attachment download failed');
          }
        }

        if (downloadedFiles.length > 0) {
          foundEmails.push({
            uid:         String(msg.uid),
            subject,
            from,
            date,
            isRPA,
            isListing,
            files:       downloadedFiles,
          });
        }
      }

      await client.logout();
    } catch (err) {
      logger.error?.({ err: err.message, userId }, '[TC-EMAIL-SCAN] IMAP search failed');
      throw err;
    }

    logger.info?.({ found: foundEmails.length, userId }, '[TC-EMAIL-SCAN] Email search complete');

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        message: `Found ${foundEmails.length} relevant emails. Set dryRun=false to proceed with upload.`,
        emails: foundEmails.map(e => ({ subject: e.subject, from: e.from, files: e.files.map(f => ({ filename: f.filename, docType: f.docType })) })),
      };
    }

    const allFilesToUpload = foundEmails.flatMap(e => e.files);
    if (!allFilesToUpload.length) {
      return { ok: false, message: 'No relevant attachments found for upload.', emails: foundEmails };
    }

    const uploadResults = await uploadFilesToSkySlope(userId, allFilesToUpload, { validateBeforeUpload: true, forceUpload: false });

    for (const email of foundEmails) {
      if (email.isRPA || email.isListing) {
        await pool.query(
          `INSERT INTO email_triage_log
             (uid, received_at, from_address, subject, category, action_required, actioned_at, notes, user_id)
           VALUES ($1,$2,$3,$4,'tc_contract',false,NOW(),'Processed by TC intake — uploaded to SkySlope',$5)
           ON CONFLICT (uid) DO UPDATE SET actioned_at=NOW(), notes='Uploaded to SkySlope', user_id=$5`,
          [email.uid, email.date, email.from, email.subject, userId]
        ).catch(dbErr => logger.error?.({ dbErr: dbErr.message, uid: email.uid }, '[TC-EMAIL-SCAN] Failed to log email triage'));
      }
    }

    return {
      ok: true,
      emailsFound: foundEmails.length,
      filesProcessed: allFilesToUpload.length,
      upload: uploadResults,
    };
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

  async function uploadFilesToSkySlope(userId, files, { address, transactionName, validateBeforeUpload = true, forceUpload = false } = {}) {
    if (!userId) {
      const err = new Error('user_id_required');
      err.status = 400;
      throw err;
    }
    if (!files || files.length === 0) {
      return { ok: false, message: 'No files provided for upload.' };
    }

    const screenshots = [];
    const uploaded = [];
    const failed = [];
    const validation = validateBeforeUpload
      ? await documentValidator.validateFiles(files, { expectedAddress: address || transactionName || null })
      : { ok: true, blocked: false, results: [] };

    if (validation.blocked && !forceUpload) {
      return {
        ok: false,
        blocked: true,
        message: 'Document validation blocked automatic upload. Review required before filing.',
        validation,
        uploaded: 0,
        failed: 0,
        screenshots,
      };
    }

    const loginResult = await tcBrowser.loginToExpOkta(false);
    const { session } = loginResult;
    screenshots.push(...(loginResult.screenshots || []));

    try {
      const navResult = await tcBrowser.navigateToSkySlope(session);
      screenshots.push(...(navResult.screenshots || []));

      await _findOrCreateSkySllopeTransaction(session, address || transactionName, screenshots);

      for (const file of files) {
        try {
          const result = await _uploadFileToSkySlope(session, file.filePath, file.docType || 'Transaction Document');
          uploaded.push({ ...file, ...result });
          logger.info?.({ file: file.filename, docType: file.docType, userId }, '[TC-EMAIL-SCAN] Uploaded to SkySlope');
        } catch (err) {
          failed.push({ ...file, error: err.message });
          logger.warn?.({ err: err.message, file: file.filename, userId }, '[TC-EMAIL-SCAN] SkySlope upload failed');
        }
      }
    } finally {
      await session.close?.().catch(() => {});
    }

    return { ok: true, uploaded: uploaded.length, failed: failed.length, uploaded, failed, screenshots, validation };
  }

  async function _findOrCreateSkySllopeTransaction(session, address, screenshots) {
    const sp0 = await screenshotPath('skyslope-pre-search');
    await session.page.screenshot({ path: sp0, fullPage: true });
    screenshots.push(sp0);

    if (address) {
      const searched = await session.page.evaluate((addr) => {
        const input = document.querySelector('input[placeholder*="search" i], input[type="search"], #searchInput, .search-input');
        if (input) { input.value = addr; input.dispatchEvent(new Event('input', { bubbles: true })); return true; }
        return false;
      }, address);

      if (searched) {
        await session.page.waitForTimeout(2000);
        await session.page.evaluate((addr) => {
          const items = Array.from(document.querySelectorAll('[class*="transaction"], [class*="result"], li, tr'));
          const match = items.find(el => el.textContent?.includes(addr.split(',')[0]));
          if (match) { match.click(); return true; }
          return false;
        }, address);
        await session.page.waitForTimeout(1500);
      }
    }

    const hasTransaction = await session.page.evaluate(() => {
      return !!document.querySelector('[class*="transaction-detail"], [class*="file-detail"], [class*="checklist"]');
    });

    if (!hasTransaction) {
      await session.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const btn = btns.find(b => /new\s+transaction|add\s+transaction|\+\stransaction/i.test(b.textContent));
        if (btn) btn.click();
      });
      await session.page.waitForTimeout(2000);

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
    await session.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, [role="tab"]'));
      const docTab = links.find(l => /document|files|checklist/i.test(l.textContent));
      if (docTab) docTab.click();
    });
    await session.page.waitForTimeout(1500);

    const [fileChooser] = await Promise.all([
      session.page.waitForFileChooser({ timeout: 15000 }),
      session.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, label'));
        const upBtn = btns.find(b => /upload|add\s+doc|attach/i.test(b.textContent));
        if (upBtn) { upBtn.click(); return; }
        const input = document.querySelector('input[type="file"]');
        if (input) input.click();
      }),
    ]);

    await fileChooser.accept([filePath]);
    await session.page.waitForTimeout(3000);

    await session.page.evaluate((type) => {
      const inputs = Array.from(document.querySelectorAll('input[placeholder*="name" i], input[placeholder*="type" i], select[name*="type" i]'));
      if (inputs[0]) { inputs[0].value = type; inputs[0].dispatchEvent(new Event('input', { bubbles: true })); }
    }, docType);

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

  return {
    findAndProcessEmails,
    uploadFilesToSkySlope,
    async findExecutedAgreements({ days = 90 } = {}) {
      return findAndProcessEmails({ days, dryRun: true, searchAll: true });
    },
    async runFullIntake({ days = 90, address, dryRun = true } = {}) {
      const emails = await findAndProcessEmails({
        days,
        dryRun: true,
        searchAll: true,
      });
      const filtered = address
        ? emails.filter((e) => {
            const hay = `${e.subject || ''} ${e.from || ''}`.toLowerCase();
            return hay.includes(String(address).toLowerCase());
          })
        : emails;
      if (dryRun) {
        return {
          ok: true,
          dryRun: true,
          found: filtered.length,
          emails: filtered.map((e) => ({
            subject: e.subject,
            from: e.from,
            date: e.date,
            isRPA: e.isRPA,
            isListing: e.isListing,
            files: (e.files || []).map((f) => ({
              filename: f.filename,
              docType: f.docType,
              size: f.size,
            })),
          })),
        };
      }
      const files = filtered.flatMap((e) => e.files || []);
      const upload = await uploadFilesToSkySlope(null, files, {
        address,
        validateBeforeUpload: true,
      });
      return { ok: true, dryRun: false, found: filtered.length, upload };
    },
  };
}

export const createTCDocIntake = createTcEmailScanAndUpload;
export default createTcEmailScanAndUpload;