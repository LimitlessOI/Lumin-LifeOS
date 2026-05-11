import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { createTCStatusEngine } from '../services/tc-status-engine.js';
import { createTCPortalService } from '../services/tc-portal-service.js';
import { createTCReportService } from '../services/tc-report-service.js';
import { createTCAutomationService } from '../services/tc-automation-service.js';
import { createTCApprovalService } from '../services/tc-approval-service.js';
import { createTCAlertService } from '../services/tc-alert-service.js';
import { createTCAsanaSyncService } from '../services/tc-asana-sync-service.js';
import { createTCWorkflowService } from '../services/tc-workflow-service.js';
import { createTCOfferPrepService } from '../services/tc-offer-prep-service.js';
import { createTCInteractionService } from '../services/tc-interaction-service.js';
import { createTCCommunicationCallbackService } from '../services/tc-communication-callback-service.js';
import { createTCMobileLinkService } from '../services/tc-mobile-link-service.js';
import { createTCFeedIngestService } from '../services/tc-feed-ingest-service.js';
import { createTCInspectionService } from '../services/tc-inspection-service.js';
import { createTCAccessService } from '../services/tc-access-service.js';
import { createTCIntakeWorkspaceService } from '../services/tc-intake-workspace-service.js';
import { createTCEmailDocumentService, deriveMailboxSearchFromTransactionAddress,
} from '../services/tc-email-document-service.js';
import { createTCInspectionForwardService } from '../services/tc-inspection-forward-service.js';
import runTransactionDeskPartySync from '../services/tc-td-party-sync.js';
import { createTDTDWorkflowRunner } from '../services/tc-td-workflow-runner.js';
import { createTDTDFormKnowledgeService } from '../services/tc-td-form-knowledge-service.js';
import { createTCAssistantService } from '../services/tc-assistant-service.js';
import { classifyR4RAttachment } from '../services/tc-r4r-attachment-classify.js';
const upload = multer({ dest: '/tmp/tc-uploads/' });
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
/* In-memory status for async TD → SkySlope listing sync (browser automation can exceed HTTP timeouts). */
const tdWorkflowJobs = new Map();
function pruneTdWorkflowJobs() {
  const now = Date.now();
  for (const [id, job] of tdWorkflowJobs) {
    const t = new Date(job.created_at || 0).getTime();
    if (now - t > LISTING_SYNC_JOB_TTL_MS) tdWorkflowJobs.delete(id);
  }
  if (tdWorkflowJobs.size <= 100) return;
  const sorted = [...tdWorkflowJobs.entries()].sort(
    (a, b) => new Date(a[1].created_at).getTime() - new Date(b[1].created_at).getTime()
  );
  while (sorted.length > 80) tdWorkflowJobs.delete(sorted.shift()[0]);
}
function pruneListingSyncJobs() {
  const now = Date.now();
  for (const [id, job] of listingTdSkyslopeJobs) {
    const t = new Date(job.created_at || 0).getTime();
    if (now - t > LISTING_SYNC_JOB_TTL_MS) listingTdSkyslopeJobs.delete(id);
  }
  if (listingTdSkyslopeJobs.size <= 100) return;
  const sorted = [...listingTdSkyslopeJobs.entries()].sort(
    (a, b) => new Date(a[1].created_at).getTime() - new Date(b[1].created_at).getTime()
  );
  while (sorted.length > 80) {
    listingTdSkyslopeJobs.delete(sorted.shift()[0]);
  }
}
const DEFAULT_BUYER_POSITION_BLURB = 'The buyer is not requesting seller repairs or closing credits based on the inspection findings. Confirm applicable state law, brokerage policy, and the contract for the exact forms and timelines—this notice is for transaction coordination only, not legal advice.';
function buildInspectionMailboxSearch(tx, body = {}) {
  const derived = deriveMailboxSearchFromTransactionAddress(tx.address);
  const maxRaw = parseInt(body.max_results, 10);
  const max_results = Number.isFinite(maxRaw) ? Math.max(1, Math.min(50, maxRaw)) : 20;
  const daysRaw = parseInt(body.days, 10);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(365, daysRaw)) : 60;
  // include_sent defaults true — TC docs are often in Adam's Sent folder (R4Rs, inspection responses)
  const include_sent = body.include_sent !== false;
  // address_hint lets the IMAP server pre-filter messages containing the property address
  const address_hint = body.address_hint != null ? String(body.address_hint) : (tx.address || '');
  return {
    days,
    subject_contains: body.subject_contains !== undefined && body.subject_contains !== null ? String(body.subject_contains) : derived.subject_contains,
    filename_contains: body.filename_contains !== undefined && body.filename_contains !== null ? String(body.filename_contains) : derived.filename_contains,
    from_contains: body.from_contains != null ? String(body.from_contains) : '',
    latest_only: false,
    max_results,
    include_sent,
    address_hint,
  };
}
function buildInspectionForwardEmailBody({ recipientName, narrative, buyerPositionSummary, transaction }) {
  const greet = recipientName?.trim() ? `Hi ${recipientName.trim()},` : 'Hi,';
  const parts = [greet, '', `Property: ${transaction.address || '—'}`];
  if (narrative?.trim()) parts.push('', narrative.trim());
  parts.push('', (buyerPositionSummary && String(buyerPositionSummary).trim()) || DEFAULT_BUYER_POSITION_BLURB);
  parts.push('', 'Attached: inspection-related PDFs gathered from the TC mailbox.');
  parts.push('', '—');
  return parts.join('\n');
}
const DEFAULT_R4R_SUBJECT_ANY = [
  'repair', 'repairs', 'inspection', 'inspect', 'response', 'request', 'binsr', 'birr', 'b-insr', 'buyer', 'notice', 'credit', 'responding', 'counter', 'deficiency', 'home inspection',
];
function buildR4RMailboxSearch(tx, body = {}) {
  const derived = deriveMailboxSearchFromTransactionAddress(tx.address);
  const maxRaw = parseInt(body.max_results, 10);
  const max_results = Number.isFinite(maxRaw) ? Math.max(1, Math.min(50, maxRaw)) : 30;
  const daysRaw = parseInt(body.days, 10);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(365, daysRaw)) : 90;
  const rawSubject = body.subject_contains != null && body.subject_contains !== '' ? String(body.subject_contains).trim() : derived.subject_contains || '';
  const subject_tokens = body.subject_tokens != null
    ? Array.isArray(body.subject_tokens)
      ? body.subject_tokens.map((t) => String(t).trim()).filter(Boolean)
      : String(body.subject_tokens)
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
    : rawSubject
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
  const subject_any_contains = body.subject_any_contains != null
    ? Array.isArray(body.subject_any_contains)
      ? body.subject_any_contains.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : String(body.subject_any_contains)
          .split(/[\s,]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
    : DEFAULT_R4R_SUBJECT_ANY;
  const filename_contains = body.filename_contains != null ? String(body.filename_contains) : '';
  return {
    days,
    subject_contains: subject_tokens.join(' ').trim(),
    subject_tokens,
    subject_any_contains,
    filename_contains,
    from_contains: body.from_contains != null ? String(body.from_contains) : '',
    latest_only: false,
    max_results,
  };
}
async function writeSellerRejectionSummaryPdf({ address, transactionId, outPath }) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('SELLER RESPONSE — REPAIR REQUEST REJECTED', {
    x: 50,
    y: 720,
    size: 14,
    font: titleFont,
    color: rgb(0.15, 0.15, 0.15),
  });
  const addrLine = String(address || '(address on file)').slice(0, 120);
  const lines = [
    '',
    `Property: ${addrLine}`,
    `LifeOS transaction id: ${transactionId}`,
    '',
    'The seller declines the buyer repair request as presented.',
    'This summary PDF was generated by LifeOS for filing in TransactionDesk.',
    `Timestamp (UTC): ${new Date().toISOString()}`,
  ];
  let y = 690;
  for (const line of lines) {
    if (line === '') {
      y -= 12;
      continue;
    }
    page.drawText(line, { x: 50, y, size: 11, font: bodyFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
  }
  const bytes = await doc.save();