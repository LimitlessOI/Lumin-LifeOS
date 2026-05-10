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
import { createTCWebhookValidationService } from '../services/tc-webhook-validation-service.js';

const upload = multer({ dest: '/tmp/tc-uploads/' });
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/* In-memory status for async TD → SkySlope listing sync (browser automation can exceed HTTP timeouts). */
const tdWorkflowJobs = new Map();
const listingTdSkyslopeJobs = new Map();

const LISTING_SYNC_JOB_TTL_MS = 2 * 60 * 60 * 1000;

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

/* Substrings; subject must include at least one (buyer “response to repairs”, inspection report, BINSR, etc.). */
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

  const filename_contains = body.filename_contains != null ? String(body.filename_contains) : derived.filename_contains;

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

/* One-page PDF so TransactionDesk shows an explicit seller rejection filing alongside mailbox PDFs. */
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
  await fs.writeFile(outPath, Buffer.from(bytes));
}

function tdInspectionForwardPlaybook(recipientName) {
  const who = recipientName?.trim() || 'your seller client';
  return {
    disclaimer: 'LifeOS can search the mailbox, attach PDFs, optionally add your listing-agent acknowledgment page to PDFs after you approve, and push files into TransactionDesk. Use screenshots to confirm UI state; finish signing and coop distribution in TransactionDesk where required.',
    known_plans: Object.keys(tcBrowser.TD_UI_PLANS || {}),
    steps: [
      'Open the TransactionDesk file for this property.',
      'Confirm inspection report and any buyer repair-request / response paperwork is correct for Nevada and your broker.',
      `Send or route signing to ${who} when those documents require client signature.`,
      'After any required client signatures, deliver the executed package to the cooperating agent per brokerage policy.',
    ],
  };
}

export function createTCRoutes(
  app,
  {
    pool,
    requireKey,
    coordinator,
    logger = console,
    accountManager: injectedAccountManager = null,
    notificationService: injectedNotificationService = null,
    callCouncilMember = null,
    sendSMS = null,
    sendAlertSms = null,
    sendAlertCall = null,
    startAlertLoop = false,
    managedEnvService = null,
  } = {}
) {
  const router = express.Router();
  const statusEngine = createTCStatusEngine();
  const portalService = createTCPortalService({ pool, coordinator, logger });
  const reportService = createTCReportService({ pool, coordinator, logger });
  const automationService = createTCAutomationService({ pool, coordinator, portalService, reportService, logger, getNotificationService, sendSMS, });
  const alertService = createTCAlertService({ pool, coordinator, logger, sendSMS, sendAlertSms, sendAlertCall });
  const asanaSyncService = createTCAsanaSyncService({ pool, coordinator, portalService, logger });
  const workflowService = createTCWorkflowService({ portalService, logger });
  const offerPrepService = createTCOfferPrepService({ logger, callCouncilMember });
  const inspectionService = createTCInspectionService({ pool, coordinator, alertService, logger });
  const interactionService = createTCInteractionService({ pool, coordinator, callCouncilMember, logger });
  const callbackService = createTCCommunicationCallbackService({ pool, portalService, reportService, coordinator, logger });
  const mobileLinkService = createTCMobileLinkService({});
  const feedIngestService = createTCFeedIngestService({ coordinator, reportService, pool, logger });
  const accessService = createTCAccessService({
    accountManager: {
      getAccount: async (...args) => (await getAccountManager()).getAccount(...args),
      upsertAccount: async (...args) => (await getAccountManager()).upsertAccount(...args),
    },
    managedEnvService,
    logger,
  });
  const intakeWorkspaceService = createTCIntakeWorkspaceService({ pool, coordinator, accessService, logger, });
  const emailDocumentService = createTCEmailDocumentService({
    accountManager: {
      getAccount: async (...args) => (await getAccountManager()).getAccount(...args),
    },
    getNotificationService,
    portalService,
    logger,
  });
  const inspectionForwardService = createTCInspectionForwardService({ coordinator, emailDocumentService, logger, getAccountManager, });
  const approvalService = createTCApprovalService({
    pool, coordinator, automationService, logger,
    customApprovalHandlers: {
      forward_inspection_docs: (approvalRow, prepared, ctx) => inspectionForwardService.executeApprovedForward(approvalRow, prepared, ctx),
    },
  });
  const tdFormKnowledgeService = createTDTDFormKnowledgeService({ pool, coordinator, logger });
  const tdWorkflowRunner = createTDTDWorkflowRunner({ coordinator, logger, getAccountManager, formKnowledgeService: tdFormKnowledgeService, });
  const tcAssistant = createTCAssistantService({ coordinator, getWorkspace: () => intakeWorkspaceService.getWorkspace(), callCouncilMember, logger, });
  const tcWebhookValidationService = createTCWebhookValidationService({ logger }); // New service instance

  let accountManagerPromise = null;
  let notificationServicePromise = null;

  async function getAccountManager() {
    if (injectedAccountManager) return injectedAccountManager;
    if (!accountManagerPromise) {
      accountManagerPromise = import('../services/account-manager.js')
        .then(({ createAccountManager }) => createAccountManager({ pool, logger }));
    }
    return accountManagerPromise;
  }

  async function getNotificationService() {
    if (injectedNotificationService) return injectedNotificationService;
    if (!notificationServicePromise) {
      notificationServicePromise = import('../core/notification-service.js')
        .then(({ NotificationService }) => new NotificationService({ pool }));
    }
    return notificationServicePromise;
  }

  // GET /api/v1/tc/status — no apiKey (deploy smoke: load balancer + Node + DB)
  router.get('/status', async (_req, res) => {
    let db = 'unknown';
    try {
      await pool.query('SELECT 1');
      db = 'ok';
    } catch (err) {
      db = 'error';
      logger.warn?.({ err: err.message }, '[TC-ROUTES] status DB check failed');
    }
    const authConfigured = Boolean(
      process.env.API_KEY || process.env.LIFEOS_KEY || process.env.COMMAND_CENTER_KEY
    );
    res.json({
      ok: true,
      service: 'transaction_coordinator',
      time: new Date().toISOString(),
      db,
      auth: {
        required: authConfigured && process.env.LIFEOS_OPEN_ACCESS !== 'true',
        configured: authConfigured,
        open_access: process.env.LIFEOS_OPEN_ACCESS === 'true',
      },
      hints: {
        portal: '/tc/agent-portal.html',
        workspace_api: '/api/v1/tc/intake/workspace (requires x-api-key when auth configured)',
        docs_railway_vars: 'https://docs.railway.app/develop