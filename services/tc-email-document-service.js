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

function emailMatches(message, search = {}) {
  const subject = String(message.subject || '').toLowerCase();
  const from = String(message.from || '').toLowerCase();
  const subjectNeedle = String(search.subject_contains || '').trim().toLowerCase();
  const fromNeedle = String(search.from_contains || '').trim().toLowerCase();
  if (subjectNeedle && !subject.includes(subjectNeedle)) return false;
  if (fromNeedle && !from.includes(fromNeedle)) return false;
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

export function createTCEmailDocumentService({
  accountManager,
  getNotificationService,
  portalService = null,
  logger = console,
}) {
  async function findAttachmentEmails({
    days = 14,
    subject_contains = '',
    from_contains = '',
    filename_contains = '',
    latest_only = true,
  } = {}) {
    await ensureWorkDir();
    const cfg = await resolveTCImapConfig({ accountManager, logger });
    if (!cfg?.auth?.pass) throw new Error('TC IMAP credentials not configured');

    const client = new ImapFlow(cfg);
    const matched = [];
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      const since = new Date(Date.now() - days * 86_400_000);
      for await (const msg of client.fetch({ since }, { envelope: true, bodyStructure: true })) {
        const candidate = {
          uid: String(msg.uid),
          seq: msg.seq,
          subject: msg.envelope?.subject || '',
          from: msg.envelope?.from?.[0]?.address || '',
          date: msg.envelope?.date || new Date(),
        };
        if (!emailMatches(candidate, { subject_contains, from_contains })) continue;
        const parts = normalizeAttachmentParts(msg.bodyStructure).filter((part) =>
          attachmentMatches(part.filename, { filename_contains })
        );
        if (!parts.length) continue;
        matched.push({ ...candidate, parts });
      }
      await client.logout();
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-EMAIL-DOCS] attachment search failed');
      throw error;
    }

    matched.sort((a, b) => new Date(b.date) - new Date(a.date));
    return latest_only ? matched.slice(0, 1) : matched;
  }

  async function downloadAttachmentsForEmail(email) {
    await ensureWorkDir();
    const cfg = await resolveTCImapConfig({ accountManager, logger });
    const client = new ImapFlow(cfg);
    const files = [];

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      for (const part of email.parts || []) {
        const safeName = String(part.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(WORK_DIR, `${email.uid}_${Date.now()}_${safeName}`);
        const partData = await client.download(email.seq, part.part);
        const size = await writeStreamToFile(partData.content, filePath);
        files.push({
          filename: part.filename,
          filePath,
          contentType: mimeTypeForFile(part.filename),
          size,
        });
      }
      await client.logout();
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-EMAIL-DOCS] attachment download failed');
      throw error;
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
    downloadAttachmentsForEmail,
    sendAttachmentPackage,
  };
}

export default createTCEmailDocumentService;
