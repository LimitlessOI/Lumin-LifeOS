/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * Approval-gated inspection mailbox gather → optional PDF acknowledgment stamp → email → optional TD upload.
 */

import path from 'path';
import fs from 'fs/promises';
import { deriveMailboxSearchFromTransactionAddress } from './tc-email-document-service.js';
import { stampListingAgentAcknowledgment } from './tc-pdf-signature-stamp.js';

const WORK_DIR = '/tmp/tc-email-docs';

function safeStampedName(filename) {
  return String(filename || 'doc.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function loadOptionalSignaturePng() {
  const b64 = process.env.TC_LISTING_AGENT_SIGNATURE_IMAGE_BASE64 || '';
  if (!b64.trim()) return null;
  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}

export function createTCInspectionForwardService({
  coordinator,
  emailDocumentService,
  logger = console,
  getAccountManager,
}) {
  async function resolveSellerRecipient(tx, body = {}) {
    if (body.recipient_email) {
      return {
        email: String(body.recipient_email).trim(),
        name: body.recipient_name ? String(body.recipient_name) : '',
        source: 'request',
      };
    }
    const parties = tx.parties || {};
    const seller = parties.seller || parties.sellers;
    if (seller?.email) {
      return {
        email: String(seller.email).trim(),
        name: seller.name || seller.full_name || seller.display_name || '',
        source: 'tc_parties_seller',
      };
    }

    const derived = deriveMailboxSearchFromTransactionAddress(tx.address);
    const daysRaw = parseInt(body.sent_search_days, 10);
    const days = Number.isFinite(daysRaw) ? Math.max(14, Math.min(400, daysRaw)) : 180;
    const subjectContains =
      body.sent_subject_contains != null && body.sent_subject_contains !== ''
        ? String(body.sent_subject_contains)
        : derived.subject_contains;

    const hints = Array.isArray(body.seller_name_hints)
      ? body.seller_name_hints.map((h) => String(h).trim()).filter(Boolean)
      : [];

    const loose = body.seller_name_loose === true;
    if (!hints.length && !loose) {
      const candidates = await emailDocumentService.findSentContactsMatching({
        days,
        subject_contains: subjectContains,
        name_hints: [],
        max_results: 8,
      });
      return {
        email: null,
        name: '',
        source: 'unresolved',
        hint:
          'No parties.seller.email — pass recipient_email, seller_name_hints (e.g. Pam), or seller_name_loose:true with subject-only Sent search.',
        candidates_preview: candidates.slice(0, 5),
      };
    }

    const candidates = await emailDocumentService.findSentContactsMatching({
      days,
      subject_contains: subjectContains,
      name_hints: hints,
      max_results: 40,
    });
    if (!candidates.length) {
      return {
        email: null,
        name: '',
        source: 'unresolved',
        tried: 'sent_mail',
        subject_contains: subjectContains,
      };
    }
    const top = candidates[0];
    return {
      email: top.email,
      name: top.name || '',
      source: hints.length ? 'sent_mail_hints' : 'sent_mail_subject_only',
      matched_subject: top.subject,
    };
  }

  async function appendStampToPdfFiles(files, { displayName, signedAtIso, signaturePngBytes, note }) {
    await fs.mkdir(WORK_DIR, { recursive: true });
    const out = [];
    for (const f of files) {
      if (!/\.pdf$/i.test(String(f.filename || ''))) {
        out.push(f);
        continue;
      }
      const target = path.join(WORK_DIR, `stamped-${Date.now()}-${safeStampedName(f.filename)}`);
      await stampListingAgentAcknowledgment(f.filePath, target, {
        displayName,
        signedAtIso,
        signaturePngBytes,
        note,
      });
      out.push({
        ...f,
        filePath: target,
        filename: f.filename?.toLowerCase().endsWith('.pdf')
          ? `listing-agent-reviewed-${f.filename}`
          : `listing-agent-reviewed-${f.filename}.pdf`,
      });
    }
    return out;
  }

  async function uploadFilesToTransactionDesk(tx, files, {
    forceUpload = false,
    docTypePrefix = 'Inspection (mailbox)',
  } = {}) {
    if (!tx?.transaction_desk_id) {
      return { ok: false, skipped: true, error: 'No transaction_desk_id on file' };
    }
    const { createTCBrowserAgent } = await import('./tc-browser-agent.js');
    const { createTCDocumentValidator } = await import('./tc-document-validator.js');
    const accountManager = await getAccountManager();
    const tcBrowser = createTCBrowserAgent({ accountManager, logger });
    const validator = createTCDocumentValidator({ logger });
    const login = await tcBrowser.loginToGLVAR(false);
    const session = login.session;
    const results = [];
    try {
      await tcBrowser.ensureOnTransactionDesk(session);
      for (const file of files) {
        const docType = `${docTypePrefix} — ${file.filename}`;
        const validation = await validator.validateFile({
          filePath: file.filePath,
          fileName: file.filename,
          docType,
          expectedAddress: tx.address || null,
        });
        if (validation.blocks_upload && !forceUpload) {
          results.push({ filename: file.filename, skipped: true, validation });
          continue;
        }
        const up = await tcBrowser.uploadDocument(session, tx.transaction_desk_id, file.filePath, docType);
        results.push({ filename: file.filename, ok: up.ok, validation, upload: up });
        await coordinator.logEvent(tx.id, 'doc_uploaded_mailbox', {
          filename: file.filename,
          docType,
          ok: up.ok,
          validation,
          source: 'inspection_forward',
        });
      }
    } finally {
      await session?.close?.();
    }
    return { ok: true, results };
  }

  /**
   * Called from approvalService.actOnApproval when prepared_action.kind === forward_inspection_docs
   */
  async function executeApprovedForward(approvalRow, prepared, { actor, notes } = {}) {
    const txId = approvalRow.transaction_id;
    const tx = await coordinator.getTransaction(txId);
    if (!tx) return { ok: false, error: 'Transaction not found' };

    const {
      search,
      only_pdf = true,
      recipient_email,
      recipient_name = '',
      subject,
      body,
      requires_listing_agent_signature = false,
      upload_to_td = false,
      force_upload = false,
      doc_type_prefix = 'Inspection (mailbox)',
    } = prepared;

    if (!recipient_email || !subject || !body) {
      return { ok: false, error: 'prepared_action missing recipient_email, subject, or body' };
    }

    const { emails, files } = await emailDocumentService.gatherAttachmentsForSearch(search, {
      onlyPdf: only_pdf !== false,
    });
    if (!files.length) {
      return { ok: false, error: 'No attachments matched search on execute — re-run prepare after new mail arrives', emails_scanned: emails.length };
    }

    const signatory =
      process.env.TC_LISTING_AGENT_SIGNATORY_NAME ||
      process.env.TC_AGENT_DISPLAY_NAME ||
      'Listing agent';
    const signedAt = new Date().toISOString();
    const sigNote =
      notes ||
      'Operator approved sending this package in LifeOS. Acknowledgment page added before client delivery where PDFs were stamped.';

    let outbound = files;
    if (requires_listing_agent_signature) {
      const png = loadOptionalSignaturePng();
      outbound = await appendStampToPdfFiles(files, {
        displayName: signatory,
        signedAtIso: signedAt,
        signaturePngBytes: png,
        note: String(sigNote),
      });
    }

    const delivery = await emailDocumentService.sendPreparedAttachmentPackage({
      transactionId: txId,
      recipientEmail: recipient_email,
      recipientName: recipient_name,
      subject,
      body,
      files: outbound,
      source_messages: emails.map((e) => ({ uid: e.uid, subject: e.subject, from: e.from })),
      dryRun: false,
    });

    let td = null;
    if (upload_to_td && delivery.ok) {
      td = await uploadFilesToTransactionDesk(tx, outbound, {
        forceUpload: !!force_upload,
        docTypePrefix: doc_type_prefix,
      });
    }

    await coordinator.logEvent(txId, 'inspection_forward_executed', {
      approval_id: approvalRow.id,
      actor: actor || 'approval',
      attachment_count: outbound.length,
      stamped: !!requires_listing_agent_signature,
      email_ok: !!delivery.ok,
      upload_to_td: !!upload_to_td,
      notes: notes || null,
    });

    return {
      ok: !!delivery.ok,
      delivery,
      upload_to_td: td,
      attachment_count: outbound.length,
      emails_scanned: emails.length,
      stamped_pdf: !!requires_listing_agent_signature,
    };
  }

  return {
    resolveSellerRecipient,
    executeApprovedForward,
  };
}

export default createTCInspectionForwardService;
