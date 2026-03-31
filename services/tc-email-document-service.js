/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-email-document-service.js
 * Finds attachment emails in the TC mailbox, combines photo attachments into a
 * single PDF, and sends the package to a recipient immediately.
 */

import { ImapFlow } from 'imapflow';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';
import { resolveTCImapConfig } from './tc-imap-config.js';

const WORK_DIR = '/tmp/tc-email-docs';
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;
const RELEVANT_EXT_RE = /\.(pdf|jpe?g|png|webp|gif|heic|tiff?)$/i;

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Surface ImapFlow chained errors (avoids opaque "Command failed" in API responses). */
function formatImapFailure(err) {
  if (!err) return 'Unknown IMAP error';
  const chain = [];
  let e = err;
  for (let i = 0; i < 6 && e; i += 1) {
    const m = e.message || (typeof e === 'string' ? e : '');
    if (m && !chain.includes(m)) chain.push(m);
    e = e.cause;
  }
  return chain.length ? chain.join(' — ') : String(err);
}

function mimeTypeForFile(filename = '') {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function normalizeAttachmentParts(structure, parts = [], partNum = '') {
  if (!structure) return parts;
  if (Array.isArray(structure.childNodes) && structure.childNodes.length) {
    structure.childNodes.forEach((child, idx) => {
      normalizeAttachmentParts(child, parts, partNum ? `${partNum}.${idx + 1}` : `${idx + 1}`);
    });
    return parts;
  }
  if (structure.disposition === 'attachment' || structure.filename) {
    const filename = structure.filename || `attachment_${partNum || '1'}`;
    if (RELEVANT_EXT_RE.test(filename)) {
      parts.push({ part: partNum || '1', filename });
    }
  }
  return parts;
}

/**
 * Subject rules (all optional):
 * - subject_tokens OR subject_contains split on whitespace: every token must appear in subject (AND).
 * - subject_any_contains: array of substrings; at least one must appear (OR). Omit or empty = skip.
 */
export function emailMatches(message, search = {}) {
  const subject = String(message.subject || '').toLowerCase();
  const from = String(message.from || '').toLowerCase();
  const fromNeedle = String(search.from_contains || '').trim().toLowerCase();
  if (fromNeedle && !from.includes(fromNeedle)) return false;

  let tokens = [];
  if (Array.isArray(search.subject_tokens) && search.subject_tokens.length) {
    tokens = search.subject_tokens.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  } else {
    const raw = String(search.subject_contains || '').trim().toLowerCase();
    if (raw) tokens = raw.split(/\s+/).filter(Boolean);
  }
  for (const t of tokens) {
    if (!subject.includes(t)) return false;
  }

  const anyList = Array.isArray(search.subject_any_contains)
    ? search.subject_any_contains.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
    : [];
  if (anyList.length && !anyList.some((needle) => subject.includes(needle))) return false;

  return true;
}

function attachmentMatches(filename, search = {}) {
  const needle = String(search.filename_contains || '').trim().toLowerCase();
  if (!needle) return true;
  return String(filename || '').toLowerCase().includes(needle);
}

async function ensureWorkDir() {
  await fs.mkdir(WORK_DIR, { recursive: true });
}

async function writeStreamToFile(stream, targetPath) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  await fs.writeFile(targetPath, buffer);
  return buffer.length;
}

async function buildPhotoPdf(files, { title = 'Photo package' } = {}) {
  const renderable = files.filter((file) => IMAGE_EXT_RE.test(file.filename || ''));
  if (!renderable.length) return null;

  const htmlParts = [];
  for (const file of renderable) {
    const buffer = await fs.readFile(file.filePath);
    const dataUri = `data:${mimeTypeForFile(file.filename)};base64,${buffer.toString('base64')}`;
    htmlParts.push(`
      <section class="page">
        <h2>${escapeHtml(file.filename)}</h2>
        <img src="${dataUri}" alt="${escapeHtml(file.filename)}" />
      </section>
    `);
  }

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .page { page-break-after: always; padding: 24px; }
        h2 { font-size: 16px; margin: 0 0 16px; }
        img { width: 100%; height: auto; object-fit: contain; }
      </style>
    </head>
    <body>
      <section class="page">
        <h1>${escapeHtml(title)}</h1>
      </section>
      ${htmlParts.join('\n')}
    </body>
  </html>`;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const filePath = path.join(WORK_DIR, `photo-package-${Date.now()}.pdf`);
    await page.pdf({ path: filePath, format: 'Letter', printBackground: true });
    return {
      filename: path.basename(filePath),
      filePath,
      contentType: 'application/pdf',
      sourceCount: renderable.length,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Suggest IMAP search hints from an on-file property address (e.g. 6453 Mahogany Peak Ave). */
export function deriveMailboxSearchFromTransactionAddress(address) {
  const a = String(address || '').trim();
  const numMatch = a.match(/\b(\d{3,6})\b/);
  const firstSeg = (a.split(',')[0] || a).trim();
  const withoutNum = firstSeg.replace(/^\d+[A-Za-z\-]*\s+/, '').trim();
  const keyword = (withoutNum.split(/\s+/).find((w) => w.length > 2) || '').trim();
  const subject_contains = [numMatch?.[1], keyword].filter(Boolean).join(' ').trim();
  return {
    subject_contains: subject_contains || keyword || '',
    filename_contains: '',
  };
}

export function createTCEmailDocumentService({
  accountManager,
  getNotificationService,
  portalService = null,
  logger = console,
}) {
  async function findAttachmentEmails(search = {}) {
    const {
      days = 14,
      from_contains = '',
      filename_contains = '',
      latest_only = true,
      max_results = 25,
    } = search;
    await ensureWorkDir();
    const cfg = await resolveTCImapConfig({ accountManager, logger });
    if (!cfg?.auth?.pass) throw new Error('TC IMAP credentials not configured');

    const client = new ImapFlow(cfg);
    const matched = [];
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const since = new Date(Date.now() - days * 86_400_000);
        for await (const msg of client.fetch({ since }, { envelope: true, bodyStructure: true })) {
          const candidate = {
            uid: String(msg.uid),
            seq: msg.seq,
            subject: msg.envelope?.subject || '',
            from: msg.envelope?.from?.[0]?.address || '',
            date: msg.envelope?.date || new Date(),
          };
          if (!emailMatches(candidate, search)) continue;
          const parts = normalizeAttachmentParts(msg.bodyStructure).filter((part) =>
            attachmentMatches(part.filename, { filename_contains })
          );
          if (!parts.length) continue;
          matched.push({ ...candidate, parts });
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-EMAIL-DOCS] attachment search failed');
      throw new Error(formatImapFailure(error));
    }

    matched.sort((a, b) => new Date(b.date) - new Date(a.date));
    const cap = Math.max(1, Math.min(50, Number(max_results) || 25));
    return latest_only ? matched.slice(0, 1) : matched.slice(0, cap);
  }

  async function pickSentMailboxPath(client) {
    const custom = process.env.TC_IMAP_SENT_MAILBOX;
    if (custom) return custom;
    const list = await client.list();
    const paths = (list || []).map((b) => b.path).filter(Boolean);
    const gmailSent = paths.find((p) => /\[gmail\]\/sent mail/i.test(p));
    if (gmailSent) return gmailSent;
    const generic = paths.find((p) => /sent/i.test(p) && !/draft/i.test(p));
    if (generic) return generic;
    return 'Sent';
  }

  /**
 Search Sent mail for messages whose subject matches (optional) and whose To line matches name hints (optional).
   Returns recent hits with email + display name for resolving seller/client addresses.
   */
  async function findSentContactsMatching({
    days = 120,
    subject_contains = '',
    name_hints = [],
    max_results = 40,
  } = {}) {
    await ensureWorkDir();
    const cfg = await resolveTCImapConfig({ accountManager, logger });
    if (!cfg?.auth?.pass) throw new Error('TC IMAP credentials not configured');

    const client = new ImapFlow(cfg);
    const matched = [];
    try {
      await client.connect();
      const sentPath = await pickSentMailboxPath(client);
      const lock = await client.getMailboxLock(sentPath);
      try {
        const since = new Date(Date.now() - days * 86_400_000);
        const hints = (name_hints || []).map((h) => String(h).trim().toLowerCase()).filter(Boolean);
        const subNeedle = String(subject_contains || '').trim().toLowerCase();

        for await (const msg of client.fetch({ since }, { envelope: true, internalDate: true })) {
          const env = msg.envelope;
          const subject = String(env?.subject || '');
          if (subNeedle && !subject.toLowerCase().includes(subNeedle)) continue;
          const date = env?.date || msg.internalDate || new Date();
          const toList = env?.to || [];
          for (const addr of toList) {
            const blob = `${addr?.name || ''} ${addr?.address || ''}`.toLowerCase();
            if (hints.length && !hints.some((h) => blob.includes(h))) continue;
            if (addr?.address) {
              matched.push({
                email: addr.address,
                name: addr.name || '',
                subject,
                date,
              });
            }
          }
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-EMAIL-DOCS] sent-mail search failed');
      throw new Error(formatImapFailure(error));
    }

    matched.sort((a, b) => new Date(b.date) - new Date(a.date));
    const cap = Math.max(1, Math.min(80, Number(max_results) || 40));
    return matched.slice(0, cap);
  }

  async function gatherAttachmentsForSearch(search = {}, { onlyPdf = false, dedupe = true } = {}) {
    const emails = await findAttachmentEmails({
      ...search,
      latest_only: false,
    });
    const seen = new Set();
    const files = [];
    for (const email of emails) {
      const downloaded = await downloadAttachmentsForEmail(email);
      for (const f of downloaded) {
        if (onlyPdf && !/\.pdf$/i.test(String(f.filename || ''))) continue;
        const key = `${f.filename}::${f.size}`;
        if (dedupe && seen.has(key)) continue;
        seen.add(key);
        files.push({
          ...f,
          source_uid: email.uid,
          source_subject: email.subject,
          source_from: email.from,
        });
      }
    }
    return { emails, files };
  }

  /** Send an already-materialized attachment list (e.g. after PDF stamp) without re-querying IMAP. */
  async function sendPreparedAttachmentPackage({
    transactionId = null,
    recipientEmail,
    recipientName = '',
    subject,
    body,
    files = [],
    source_messages = [],
    dryRun = false,
  } = {}) {
    if (!recipientEmail) throw new Error('recipientEmail is required');
    if (!subject) throw new Error('subject is required');
    if (!body) throw new Error('body is required');
    if (!files?.length) {
      return { ok: false, error: 'No files supplied' };
    }

    const attachments = files.map((item) => ({
      filename: item.filename,
      filePath: item.filePath,
      contentType: item.contentType || mimeTypeForFile(item.filename),
    }));

    const metadata = {
      to: recipientEmail,
      recipient_name: recipientName || null,
      attachments: attachments.map((item) => ({
        filename: item.filename,
        filePath: item.filePath,
        contentType: item.contentType,
      })),
      source_messages: source_messages || [],
    };

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        attachment_count: files.length,
        attachments: metadata.attachments,
        metadata,
      };
    }

    let communication = null;
    if (transactionId && portalService?.createCommunication) {
      communication = await portalService.createCommunication(transactionId, {
        channel: 'email',
        audience: 'agent',
        subject,
        body,
        status: 'draft',
        metadata,
      });
    }

    const notificationService = await getNotificationService();
    const delivery = await notificationService.sendEmail({
      to: recipientEmail,
      subject,
      text: body,
      metadata,
      attachments: metadata.attachments,
    });

    if (communication && portalService?.updateCommunication) {
      await portalService.updateCommunication(communication.id, {
        status: delivery.success ? 'sent' : 'failed',
        sent_at: delivery.success ? new Date().toISOString() : null,
        metadata: { ...metadata, delivery },
      });
    }

    return {
      ok: !!delivery.success,
      communication,
      delivery,
      attachment_count: files.length,
    };
  }

  async function sendGatheredAttachmentPackage({
    transactionId = null,
    recipientEmail,
    recipientName = '',
    subject,
    body,
    search = {},
    onlyPdf = true,
    dryRun = false,
  } = {}) {
    if (!recipientEmail) throw new Error('recipientEmail is required');
    if (!subject) throw new Error('subject is required');
    if (!body) throw new Error('body is required');

    const { emails, files } = await gatherAttachmentsForSearch(search, { onlyPdf });
    if (!files.length) {
      return {
        ok: false,
        error: 'No matching messages with attachments',
        search,
        emails_scanned: emails.length,
      };
    }

    const sent = await sendPreparedAttachmentPackage({
      transactionId,
      recipientEmail,
      recipientName,
      subject,
      body,
      files,
      source_messages: emails.map((e) => ({
        uid: e.uid,
        subject: e.subject,
        from: e.from,
      })),
      dryRun,
    });

    return {
      ...sent,
      emails_scanned: emails.length,
    };
  }

  async function downloadAttachmentsForEmail(email) {
    await ensureWorkDir();
    const cfg = await resolveTCImapConfig({ accountManager, logger });
    const client = new ImapFlow(cfg);
    const files = [];

    const uidNum = Number.parseInt(String(email.uid), 10);
    if (!Number.isFinite(uidNum)) {
      throw new Error('Invalid message uid for IMAP download');
    }

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        for (const part of email.parts || []) {
          const safeName = String(part.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = path.join(WORK_DIR, `${email.uid}_${Date.now()}_${safeName}`);
          const partData = await client.download(uidNum, part.part, { uid: true });
          const size = await writeStreamToFile(partData.content, filePath);
          files.push({
            filename: part.filename,
            filePath,
            contentType: mimeTypeForFile(part.filename),
            size,
          });
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-EMAIL-DOCS] attachment download failed');
      throw new Error(formatImapFailure(error));
    }

    return files;
  }

  async function sendAttachmentPackage({
    transactionId = null,
    recipientEmail,
    recipientName = '',
    subject,
    body,
    search = {},
    combinePhotos = true,
    attachOriginals = false,
    dryRun = false,
  } = {}) {
    if (!recipientEmail) throw new Error('recipientEmail is required');
    if (!subject) throw new Error('subject is required');
    if (!body) throw new Error('body is required');

    const emails = await findAttachmentEmails(search);
    if (!emails.length) {
      return { ok: false, error: 'No matching email with attachments found', search };
    }

    const sourceEmail = emails[0];
    const downloaded = await downloadAttachmentsForEmail(sourceEmail);
    if (!downloaded.length) {
      return { ok: false, error: 'Matching email found, but no downloadable attachments matched', sourceEmail };
    }

    const attachments = [];
    let combined = null;
    if (combinePhotos) {
      combined = await buildPhotoPdf(downloaded, {
        title: subject,
      });
      if (combined) attachments.push(combined);
    }

    if (attachOriginals) {
      attachments.push(...downloaded.map((file) => ({
        filename: file.filename,
        filePath: file.filePath,
        contentType: file.contentType,
      })));
    }

    if (!attachments.length) {
      attachments.push(...downloaded.map((file) => ({
        filename: file.filename,
        filePath: file.filePath,
        contentType: file.contentType,
      })));
    }

    const metadata = {
      to: recipientEmail,
      recipient_name: recipientName || null,
      source_email_uid: sourceEmail.uid,
      source_email_subject: sourceEmail.subject,
      source_email_from: sourceEmail.from,
      attachments: attachments.map((item) => ({
        filename: item.filename,
        filePath: item.filePath,
        contentType: item.contentType || mimeTypeForFile(item.filename),
      })),
    };

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        sourceEmail,
        downloadedAttachments: downloaded,
        combinedAttachment: combined,
        metadata,
      };
    }

    let communication = null;
    if (transactionId && portalService?.createCommunication) {
      communication = await portalService.createCommunication(transactionId, {
        channel: 'email',
        audience: 'agent',
        subject,
        body,
        status: 'draft',
        metadata,
      });
    }

    const notificationService = await getNotificationService();
    const delivery = await notificationService.sendEmail({
      to: recipientEmail,
      subject,
      text: body,
      metadata,
      attachments: metadata.attachments,
    });

    if (communication && portalService?.updateCommunication) {
      await portalService.updateCommunication(communication.id, {
        status: delivery.success ? 'sent' : 'failed',
        sent_at: delivery.success ? new Date().toISOString() : null,
        metadata: {
          ...metadata,
          delivery,
        },
      });
    }

    return {
      ok: !!delivery.success,
      communication,
      delivery,
      sourceEmail,
      downloadedAttachments: downloaded,
      combinedAttachment: combined,
    };
  }

  return {
    findAttachmentEmails,
    findSentContactsMatching,
    downloadAttachmentsForEmail,
    gatherAttachmentsForSearch,
    sendPreparedAttachmentPackage,
    sendGatheredAttachmentPackage,
    sendAttachmentPackage,
  };
}

export default createTCEmailDocumentService;
