/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-routes.js
 * Transaction Coordinator API endpoints.
 *
 * Mounted at: /api/v1/tc
 * Deps: services/tc-coordinator.js
 */

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
import {
  createTCEmailDocumentService,
  deriveMailboxSearchFromTransactionAddress,
} from '../services/tc-email-document-service.js';
import { createTCInspectionForwardService } from '../services/tc-inspection-forward-service.js';
import runTransactionDeskPartySync from '../services/tc-td-party-sync.js';
import { createTDTDWorkflowRunner } from '../services/tc-td-workflow-runner.js';
import { createTDTDFormKnowledgeService } from '../services/tc-td-form-knowledge-service.js';
import { createTCAssistantService } from '../services/tc-assistant-service.js';
import { classifyR4RAttachment } from '../services/tc-r4r-attachment-classify.js';

const upload = multer({ dest: '/tmp/tc-uploads/' });
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/** In-memory status for async TD → SkySlope listing sync (browser automation can exceed HTTP timeouts). */
const listingTdSkyslopeJobs = new Map();
const LISTING_SYNC_JOB_TTL_MS = 2 * 60 * 60 * 1000;

/** Async TD-only workflow jobs (party sync, UI chains). */
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

const DEFAULT_BUYER_POSITION_BLURB =
  'The buyer is not requesting seller repairs or closing credits based on the inspection findings. Confirm applicable state law, brokerage policy, and the contract for the exact forms and timelines—this notice is for transaction coordination only, not legal advice.';

function buildInspectionMailboxSearch(tx, body = {}) {
  const derived = deriveMailboxSearchFromTransactionAddress(tx.address);
  const maxRaw = parseInt(body.max_results, 10);
  const max_results = Number.isFinite(maxRaw) ? Math.max(1, Math.min(50, maxRaw)) : 20;
  const daysRaw = parseInt(body.days, 10);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(365, daysRaw)) : 60;
  return {
    days,
    subject_contains:
      body.subject_contains !== undefined && body.subject_contains !== null
        ? String(body.subject_contains)
        : derived.subject_contains,
    filename_contains:
      body.filename_contains !== undefined && body.filename_contains !== null
        ? String(body.filename_contains)
        : derived.filename_contains,
    from_contains: body.from_contains != null ? String(body.from_contains) : '',
    latest_only: false,
    max_results,
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

/** Substrings; subject must include at least one (buyer “response to repairs”, inspection report, BINSR, etc.). */
const DEFAULT_R4R_SUBJECT_ANY = [
  'repair',
  'repairs',
  'inspection',
  'inspect',
  'response',
  'request',
  'binsr',
  'birr',
  'b-insr',
  'buyer',
  'notice',
  'credit',
  'responding',
  'counter',
  'deficiency',
  'home inspection',
];

function buildR4RMailboxSearch(tx, body = {}) {
  const derived = deriveMailboxSearchFromTransactionAddress(tx.address);
  const maxRaw = parseInt(body.max_results, 10);
  const max_results = Number.isFinite(maxRaw) ? Math.max(1, Math.min(50, maxRaw)) : 30;
  const daysRaw = parseInt(body.days, 10);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(365, daysRaw)) : 90;

  const rawSubject =
    body.subject_contains != null && body.subject_contains !== ''
      ? String(body.subject_contains).trim()
      : derived.subject_contains || '';

  const subject_tokens =
    body.subject_tokens != null
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

  const subject_any_contains =
    body.subject_any_contains != null
      ? Array.isArray(body.subject_any_contains)
        ? body.subject_any_contains.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
        : String(body.subject_any_contains)
            .split(/[\s,]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
      : DEFAULT_R4R_SUBJECT_ANY;

  const filename_contains =
    body.filename_contains != null ? String(body.filename_contains) : '';
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

/** One-page PDF so TransactionDesk shows an explicit seller rejection filing alongside mailbox PDFs. */
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
    disclaimer:
      'LifeOS can search the mailbox, attach PDFs, optionally add your listing-agent acknowledgment page to PDFs after you approve, and push files into TransactionDesk. TransactionDesk e-sign for the client and coop-side distribution are still operator steps where your broker requires them.',
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
  const automationService = createTCAutomationService({
    pool,
    coordinator,
    portalService,
    reportService,
    logger,
    getNotificationService,
    sendSMS,
  });
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
  const intakeWorkspaceService = createTCIntakeWorkspaceService({
    pool,
    coordinator,
    accessService,
    logger,
  });
  const emailDocumentService = createTCEmailDocumentService({
    accountManager: {
      getAccount: async (...args) => (await getAccountManager()).getAccount(...args),
    },
    getNotificationService,
    portalService,
    logger,
  });
  const inspectionForwardService = createTCInspectionForwardService({
    coordinator,
    emailDocumentService,
    logger,
    getAccountManager,
  });
  const approvalService = createTCApprovalService({
    pool,
    coordinator,
    automationService,
    logger,
    customApprovalHandlers: {
      forward_inspection_docs: (approvalRow, prepared, ctx) =>
        inspectionForwardService.executeApprovedForward(approvalRow, prepared, ctx),
    },
  });
  const tdFormKnowledgeService = createTDTDFormKnowledgeService({ pool, coordinator, logger });
  const tdWorkflowRunner = createTDTDWorkflowRunner({
    coordinator,
    logger,
    getAccountManager,
    formKnowledgeService: tdFormKnowledgeService,
  });
  const tcAssistant = createTCAssistantService({
    coordinator,
    getWorkspace: () => intakeWorkspaceService.getWorkspace(),
    callCouncilMember,
    logger,
  });
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

  // GET /api/v1/tc/status — no API key (deploy smoke: load balancer + Node + DB)
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
        docs_railway_vars: 'https://docs.railway.app/develop/variables',
      },
    });
  });

  router.get('/access/readiness', requireKey, async (_req, res) => {
    try {
      const readiness = await accessService.getAccessReadiness();
      res.json({ ok: true, readiness });
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-ROUTES] access readiness failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/access/bootstrap', requireKey, async (req, res) => {
    try {
      const result = await accessService.bootstrapAccess({
        actor: req.body?.actor || 'tc_overlay',
        workEmail: req.body?.work_email || '',
        tcImapUser: req.body?.tc_imap_user || '',
        tcAgentName: req.body?.tc_agent_name || '',
        tcAgentPhone: req.body?.tc_agent_phone || '',
        tcEmailFrom: req.body?.tc_email_from || '',
        emailWebhookSecret: req.body?.email_webhook_secret || '',
        twilioWebhookSecret: req.body?.twilio_webhook_secret || '',
        imapPassword: req.body?.imap_password || '',
        glvarUsername: req.body?.glvar_username || '',
        glvarPassword: req.body?.glvar_password || '',
        expOktaUsername: req.body?.exp_okta_username || '',
        expOktaPassword: req.body?.exp_okta_password || '',
        asanaAccessToken: req.body?.asana_access_token || '',
        asanaProjectGid: req.body?.asana_tc_project_gid || '',
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-ROUTES] access bootstrap failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/access/seed-defaults', requireKey, async (req, res) => {
    try {
      const result = await accessService.seedKnownEnvDefaults({
        actor: req.body?.actor || 'tc_overlay',
        workEmail: req.body?.work_email || '',
        tcImapUser: req.body?.tc_imap_user || '',
        tcAgentName: req.body?.tc_agent_name || '',
        tcAgentPhone: req.body?.tc_agent_phone || '',
        tcEmailFrom: req.body?.tc_email_from || '',
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-ROUTES] access seed defaults failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/intake/workspace', requireKey, async (_req, res) => {
    try {
      const workspace = await intakeWorkspaceService.getWorkspace();
      res.json({ ok: true, workspace });
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-ROUTES] intake workspace failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // POST /api/v1/tc/assistant/chat — TC-aware chat (workspace + files + optional council)
  router.post('/assistant/chat', requireKey, express.json(), async (req, res) => {
    try {
      const { message, transaction_id, use_ai } = req.body || {};
      const result = await tcAssistant.answer({
        message,
        transaction_id: transaction_id != null && transaction_id !== '' ? transaction_id : null,
        use_ai: use_ai !== false,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[TC-ROUTES] assistant chat failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  async function queueCommunicationApprovals(transactionId, communications, {
    titlePrefix = 'Review prepared communication',
    summary = null,
    priority = 'normal',
    dueAt = null,
    actorMetadata = {},
  } = {}) {
    const approvals = [];
    for (const item of communications || []) {
      const title = `${titlePrefix}: ${item.subject || item.template_key || item.channel}`;
      const approval = await approvalService.createApproval(transactionId, {
        category: 'communication',
        title,
        summary: summary || `Prepared ${item.channel} message for ${item.audience}.`,
        priority,
        due_at: dueAt,
        target_type: 'communication',
        target_id: item.id,
        prepared_action: { kind: 'send_communication', communication_id: item.id },
        metadata: { communication_id: item.id, ...actorMetadata },
      });
      approvals.push(approval);

      if (priority === 'urgent' || priority === 'critical') {
        await alertService.createAlert(transactionId, {
          severity: priority === 'critical' ? 'critical' : 'urgent',
          title,
          summary: summary || `Prepared ${item.channel} communication requires approval.`,
          target_type: 'approval',
          target_id: approval.id,
          prepared_action: { label: 'Review and approve prepared communication' },
          metadata: { communication_id: item.id },
        });
      }
    }
    return approvals;
  }

  if (startAlertLoop) {
    alertService.startScheduler();
  }

  // GET /api/v1/tc/dashboard — summary stats
  router.get('/dashboard', requireKey, async (req, res) => {
    try {
      const data = await coordinator.getDashboard();
      const activeRows = await pool.query(
        `SELECT id FROM tc_transactions WHERE status IN ('active','pending') ORDER BY close_date ASC NULLS LAST LIMIT 25`
      );
      const reports = await Promise.all(activeRows.rows.map((row) => coordinator.generateStatusReport(row.id)));
      const validReports = reports.filter(Boolean);
      const portfolioHealth = {
        green: validReports.filter((item) => item.health_status === 'green').length,
        yellow: validReports.filter((item) => item.health_status === 'yellow').length,
        red: validReports.filter((item) => item.health_status === 'red').length,
      };
      const attention = validReports
        .filter((item) => item.health_status !== 'green' || item.blocker_count > 0)
        .slice(0, 10)
        .map((item) => ({
          transaction_id: item.transaction.id,
          address: item.transaction.address,
          stage: item.stage,
          health_status: item.health_status,
          next_action: item.next_action,
          blocker_count: item.blocker_count,
          missing_doc_count: item.missing_doc_count,
        }));

      const dashboardSlice = await portalService.buildDashboardSlice(25);
      res.json({ ok: true, ...data, portfolioHealth, attention, files: dashboardSlice });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] dashboard error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions — list all (filterable by ?status=)
  router.get('/transactions', requireKey, async (req, res) => {
    try {
      const status = req.query.status || null;
      const includeStatus = String(req.query.includeStatus || 'false').toLowerCase() === 'true';
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const where = status ? 'WHERE status=$1' : '';
      const params = status ? [status] : [];
      const { rows } = await pool.query(
        `SELECT * FROM tc_transactions ${where} ORDER BY close_date ASC NULLS LAST LIMIT ${limit}`,
        params
      );

      if (!includeStatus) {
        return res.json({ ok: true, transactions: rows, count: rows.length });
      }

      const transactions = await Promise.all(rows.map(async (transaction) => {
        const events = await coordinator.getTransactionEvents(transaction.id, 20);
        return {
          ...transaction,
          status_summary: statusEngine.deriveTransactionState({ transaction, events }),
        };
      }));

      res.json({ ok: true, transactions, count: transactions.length, includeStatus: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id — single transaction + status report
  router.get('/transactions/:id', requireKey, async (req, res) => {
    try {
      const report = await coordinator.generateStatusReport(parseInt(req.params.id));
      if (!report) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/status — derived at-a-glance file state for portal views
  router.get('/transactions/:id/status', requireKey, async (req, res) => {
    try {
      const report = await coordinator.generateStatusReport(parseInt(req.params.id));
      if (!report) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const { transaction, recentEvents, ...statusView } = report;
      res.json({ ok: true, transaction: { id: transaction.id, address: transaction.address, status: transaction.status, agent_role: transaction.agent_role }, status: statusView, recentEvents });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/overview — portal-ready overview (agent or client view)
  router.get('/transactions/:id/overview', requireKey, async (req, res) => {
    try {
      const view = String(req.query.view || 'agent').toLowerCase() === 'client' ? 'client' : 'agent';
      const overview = await portalService.buildOverview(parseInt(req.params.id), { view });
      if (!overview) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.json({ ok: true, view, ...overview });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/workflow
  router.get('/transactions/:id/workflow', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const workflow = await workflowService.buildWorkflow(txId);
      if (!workflow) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.json({ ok: true, ...workflow });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/asana/preview
  router.get('/transactions/:id/asana/preview', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const preview = await asanaSyncService.previewTransaction(txId);
      if (!preview) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.json({ ok: true, configured: asanaSyncService.isConfigured(), ...preview });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/offers/prepare
  router.post('/offers/prepare', requireKey, async (req, res) => {
    try {
      const result = await offerPrepService.prepareOffer(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/offers/prepare
  router.post('/transactions/:id/offers/prepare', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const body = req.body || {};
      const clientProfile = body.clientProfile || body.client_profile || tx.parties?.buyer || tx.parties?.seller || {};
      const result = await offerPrepService.prepareOffer({
        ...body,
        clientProfile,
        property: body.property || { address: tx.address, list_price: tx.purchase_price || null },
      });
      res.json({ transaction_id: txId, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/asana/sync
  router.post('/transactions/:id/asana/sync', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const result = await asanaSyncService.syncTransaction(txId);
      if (!result.ok) {
        const status = result.error === 'Transaction not found' ? 404 : 503;
        return res.status(status).json(result);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/interactions
  router.get('/transactions/:id/interactions', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const limit = Math.min(parseInt(req.query.limit) || 25, 200);
      const items = await interactionService.listInteractions(txId, { limit });
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/interactions
  router.post('/transactions/:id/interactions', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const item = await interactionService.createInteraction(txId, req.body || {});
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/interactions/:interactionId
  router.patch('/interactions/:interactionId', requireKey, async (req, res) => {
    try {
      const item = await interactionService.updateInteraction(parseInt(req.params.interactionId), req.body || {});
      if (!item) return res.status(404).json({ ok: false, error: 'Interaction not found' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/interactions/:interactionId/analyze
  router.post('/interactions/:interactionId/analyze', requireKey, async (req, res) => {
    try {
      const interactionId = parseInt(req.params.interactionId);
      const result = await interactionService.analyzeInteraction(interactionId, req.body || {});
      if (!result.ok) return res.status(400).json(result);

      const approvals = [];
      if ((req.body?.queue_review ?? true) && result.interaction?.transaction_id && (result.profile_updates?.length || result.commitments?.length)) {
        approvals.push(await approvalService.createApproval(result.interaction.transaction_id, {
          category: 'interaction_review',
          title: `Review interaction insights: ${result.interaction.contact_name || result.interaction.contact_role || 'client interaction'}`,
          summary: `${result.profile_updates.length} profile updates and ${result.commitments.length} commitments detected.`,
          priority: result.commitments.length ? 'high' : 'normal',
          target_type: 'interaction',
          target_id: interactionId,
          prepared_action: { kind: 'review_interaction_insights', interaction_id: interactionId },
          metadata: { profile_update_count: result.profile_updates.length, commitment_count: result.commitments.length },
        }));
      }

      const alerts = [];
      for (const commitment of result.stored_commitments || []) {
        if (!commitment.deadline) continue;
        const deadline = new Date(commitment.deadline);
        const hours = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hours <= 24) {
          alerts.push(await alertService.createAlert(result.interaction.transaction_id, {
            severity: hours <= 6 ? 'critical' : 'urgent',
            title: `Commitment deadline approaching: ${commitment.normalized_text || commitment.raw_text}`,
            summary: `Detected from interaction review. Deadline: ${commitment.deadline}.`,
            target_type: 'interaction',
            target_id: interactionId,
            prepared_action: { label: 'Review commitment and confirm follow-through plan' },
            metadata: { commitment_id: commitment.id, deadline: commitment.deadline },
          }));
        }
      }

      res.json({ ok: true, ...result, approvals, alerts });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/interactions/:interactionId/analyze/audio
  router.post('/interactions/:interactionId/analyze/audio', requireKey, audioUpload.single('audio'), async (req, res) => {
    try {
      const interactionId = parseInt(req.params.interactionId);
      const payload = {
        ...req.body,
        audioFile: req.file || null,
        persist_commitments: String(req.body?.persist_commitments || 'true').toLowerCase() !== 'false',
      };
      const result = await interactionService.analyzeInteraction(interactionId, payload);
      if (!result.ok) return res.status(400).json(result);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/document-requests
  router.get('/transactions/:id/document-requests', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const items = await portalService.listDocumentRequests(txId);
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/document-requests
  router.post('/transactions/:id/document-requests', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const { title, description = null, requested_from = 'client', due_at = null, metadata = {} } = req.body || {};
      if (!title) return res.status(400).json({ ok: false, error: 'title is required' });
      const item = await portalService.createDocumentRequest(txId, { title, description, requested_from, due_at, metadata });
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/document-requests/:requestId
  router.patch('/document-requests/:requestId', requireKey, async (req, res) => {
    try {
      const item = await portalService.updateDocumentRequest(parseInt(req.params.requestId), req.body || {});
      if (!item) return res.status(404).json({ ok: false, error: 'Document request not found or no patch fields supplied' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/communications
  router.get('/transactions/:id/communications', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const items = await portalService.listCommunications(txId);
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/communications
  router.post('/transactions/:id/communications', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const { channel = 'email', audience = 'client', template_key = null, subject = null, body, status = 'draft', sent_at = null, metadata = {} } = req.body || {};
      if (!body) return res.status(400).json({ ok: false, error: 'body is required' });
      const item = await portalService.createCommunication(txId, { channel, audience, template_key, subject, body, status, sent_at, metadata });
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/communications/:communicationId
  router.patch('/communications/:communicationId', requireKey, async (req, res) => {
    try {
      const item = await portalService.updateCommunication(parseInt(req.params.communicationId), req.body || {});
      if (!item) return res.status(404).json({ ok: false, error: 'Communication not found or no patch fields supplied' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/communications/:communicationId/send
  router.post('/communications/:communicationId/send', requireKey, async (req, res) => {
    try {
      const result = await automationService.sendCommunicationById(parseInt(req.params.communicationId));
      if (!result.ok) return res.status(400).json({ ok: false, error: result.error || 'Send failed', ...result });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/communications/:communicationId/callback
  router.post('/communications/:communicationId/callback', async (req, res) => {
    try {
      const result = await callbackService.handleCallback(parseInt(req.params.communicationId), req.body || {});
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/webhooks/postmark
  router.post('/webhooks/postmark', express.json({ type: 'application/json' }), async (req, res) => {
    try {
      const secret = process.env.EMAIL_WEBHOOK_SECRET;
      if (!secret) return res.status(503).json({ ok: false, error: 'EMAIL_WEBHOOK_SECRET not configured' });
      const provided = req.headers['x-email-webhook-secret'];
      if (!provided || provided !== secret) return res.status(401).json({ ok: false, error: 'Unauthorized webhook' });

      const metadata = req.body?.Metadata || req.body?.metadata || {};
      const result = await callbackService.handleProviderWebhook({
        provider: 'postmark',
        external_id: req.body?.MessageID || req.body?.MessageId || null,
        event_type: req.body?.RecordType || req.body?.Type || req.body?.EmailEvent || 'delivered',
        communication_id: metadata.communication_id || null,
        status: req.body?.Type || req.body?.RecordType || null,
        body: req.body?.TextBody || null,
        from: req.body?.From || null,
        to: req.body?.Recipient || null,
        raw: req.body,
      });
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/webhooks/twilio
  router.post('/webhooks/twilio', express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const secret = process.env.EMAIL_WEBHOOK_SECRET || process.env.TWILIO_WEBHOOK_SECRET || null;
      if (secret) {
        const provided = req.headers['x-email-webhook-secret'] || req.headers['x-tc-webhook-secret'];
        if (!provided || provided !== secret) return res.status(401).json({ ok: false, error: 'Unauthorized webhook' });
      }

      const result = await callbackService.handleProviderWebhook({
        provider: 'twilio',
        external_id: req.body?.MessageSid || req.body?.SmsSid || req.body?.Sid || null,
        event_type: req.body?.MessageStatus || req.body?.SmsStatus || req.body?.EventType || 'delivered',
        communication_id: req.body?.communication_id || null,
        status: req.body?.MessageStatus || req.body?.SmsStatus || null,
        body: req.body?.Body || null,
        from: req.body?.From || null,
        to: req.body?.To || null,
        raw: req.body,
      });
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/approvals/pending
  router.get('/approvals/pending', requireKey, async (req, res) => {
    try {
      const status = req.query.status || null;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const items = await approvalService.listApprovals({ status, limit });
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/alerts
  router.get('/transactions/:id/alerts', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const status = req.query.status || null;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const items = await alertService.listAlerts({ transactionId: txId, status, limit });
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/alerts
  router.post('/transactions/:id/alerts', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const { severity = 'action_required', title, summary = null, assigned_to = null, target_type = null, target_id = null, prepared_action = {}, metadata = {}, next_escalation_at = new Date().toISOString() } = req.body || {};
      if (!title) return res.status(400).json({ ok: false, error: 'title is required' });
      const item = await alertService.createAlert(txId, { severity, title, summary, assigned_to, target_type, target_id, prepared_action, metadata, next_escalation_at });
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/alerts/:alertId
  router.patch('/alerts/:alertId', requireKey, async (req, res) => {
    try {
      const item = await alertService.updateAlert(parseInt(req.params.alertId), req.body || {});
      if (!item) return res.status(404).json({ ok: false, error: 'Alert not found' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/approvals
  router.get('/transactions/:id/approvals', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const status = req.query.status || null;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const items = await approvalService.listApprovals({ transactionId: txId, status, limit });
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/approvals
  router.post('/transactions/:id/approvals', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const { category = 'task', title, summary = null, priority = 'normal', due_at = null, target_type = null, target_id = null, prepared_action = {}, metadata = {} } = req.body || {};
      if (!title) return res.status(400).json({ ok: false, error: 'title is required' });
      const item = await approvalService.createApproval(txId, { category, title, summary, priority, due_at, target_type, target_id, prepared_action, metadata });
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/approvals/:approvalId
  router.patch('/approvals/:approvalId', requireKey, async (req, res) => {
    try {
      const item = await approvalService.updateApproval(parseInt(req.params.approvalId), req.body || {});
      if (!item) return res.status(404).json({ ok: false, error: 'Approval not found' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/mobile-links/approval/:approvalId
  router.post('/mobile-links/approval/:approvalId', requireKey, async (req, res) => {
    try {
      const approval = await approvalService.getApproval(parseInt(req.params.approvalId));
      if (!approval) return res.status(404).json({ ok: false, error: 'Approval not found' });
      const link = mobileLinkService.createApprovalLink(approval, req.body || {});
      res.json({ ok: true, ...link });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/mobile-links/alert/:alertId
  router.post('/mobile-links/alert/:alertId', requireKey, async (req, res) => {
    try {
      const alert = await alertService.getAlert(parseInt(req.params.alertId));
      if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });
      const link = mobileLinkService.createAlertLink(alert, req.body || {});
      res.json({ ok: true, ...link });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/mobile-links/execute
  router.get('/mobile-links/execute', async (req, res) => {
    try {
      const payload = mobileLinkService.verifyToken(req.query.token);
      let result = null;
      if (payload.kind === 'approval') {
        result = await approvalService.actOnApproval(payload.target_id, { action: payload.action, actor: 'mobile_link' });
      } else if (payload.kind === 'alert') {
        result = await alertService.actOnAlert(payload.target_id, { action: payload.action, actor: 'mobile_link' });
      }
      if (!result) return res.status(404).send('<html><body><h2>Link invalid</h2></body></html>');
      const reviewLink = payload.review_url ? `<p><a href="${payload.review_url}">Open transaction</a></p>` : '';
      res.send(`<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:24px"><h2>Action complete</h2><p>${payload.kind} ${payload.action} applied.</p>${reviewLink}</body></html>`);
    } catch (err) {
      res.status(400).send(`<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:24px"><h2>Link unavailable</h2><p>${String(err.message || 'Invalid token')}</p></body></html>`);
    }
  });

  // GET /api/v1/tc/transactions/:id/showings
  router.get('/transactions/:id/showings', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const items = await reportService.listShowings(txId);
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/showings
  router.post('/transactions/:id/showings', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const { showing_at, status = 'scheduled', showing_agent_name = null, showing_agent_email = null, showing_agent_phone = null, source = 'manual', notes = null, metadata = {} } = req.body || {};
      if (!showing_at) return res.status(400).json({ ok: false, error: 'showing_at is required' });
      const item = await reportService.createShowing(txId, { showing_at, status, showing_agent_name, showing_agent_email, showing_agent_phone, source, notes, metadata });
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/feed/showings
  router.post('/transactions/:id/feed/showings', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const items = await feedIngestService.ingestShowings(txId, req.body || {});
      res.status(201).json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/showings/:showingId
  router.patch('/showings/:showingId', requireKey, async (req, res) => {
    try {
      const item = await reportService.updateShowing(parseInt(req.params.showingId), req.body || {});
      if (!item) return res.status(404).json({ ok: false, error: 'Showing not found or no patch fields supplied' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/showings/:showingId/request-feedback
  router.post('/showings/:showingId/request-feedback', requireKey, async (req, res) => {
    try {
      const showingId = parseInt(req.params.showingId);
      const { channels = ['sms', 'email'], send_now = true, require_approval = false, due_at = null } = req.body || {};
      const result = await automationService.prepareShowingFeedbackRequest(showingId, {
        channels: Array.isArray(channels) ? channels : [channels],
        sendNow: !require_approval && send_now !== false,
      });
      if (!result.ok) return res.status(404).json(result);
      let approvals = [];
      if (require_approval && result.showing?.transaction_id) {
        approvals = await queueCommunicationApprovals(result.showing.transaction_id, result.communications, {
          titlePrefix: 'Approve showing feedback request',
          summary: 'Prepared follow-up to collect showing feedback.',
          priority: 'normal',
          dueAt: due_at,
          actorMetadata: { showing_id: showingId },
        });
      }
      res.json({ ok: true, ...result, approvals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/showings/:showingId/feedback
  router.post('/showings/:showingId/feedback', requireKey, async (req, res) => {
    try {
      const { raw_feedback, sentiment = null, rating = null, price_feedback = null, condition_feedback = null, competition_feedback = null, source = 'manual' } = req.body || {};
      if (!raw_feedback) return res.status(400).json({ ok: false, error: 'raw_feedback is required' });
      const item = await reportService.recordShowingFeedback(parseInt(req.params.showingId), { raw_feedback, sentiment, rating, price_feedback, condition_feedback, competition_feedback, source });
      if (!item) return res.status(404).json({ ok: false, error: 'Showing not found' });
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/feedback
  router.get('/transactions/:id/feedback', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const items = await reportService.listShowingFeedback(txId);
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/market-snapshot
  router.post('/transactions/:id/market-snapshot', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const item = await reportService.createMarketSnapshot(txId, req.body || {});
      res.status(201).json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/feed/mls
  router.post('/transactions/:id/feed/mls', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const snapshot = await feedIngestService.ingestMarketSnapshot(txId, req.body || {});
      res.status(201).json({ ok: true, snapshot });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/reports/weekly
  router.post('/transactions/:id/reports/weekly', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const { audience = 'seller', reference_date = new Date().toISOString() } = req.body || {};
      const report = await reportService.generateWeeklyReport(txId, { audience, referenceDate: new Date(reference_date) });
      res.status(201).json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/reports/weekly/prepare
  router.post('/transactions/:id/reports/weekly/prepare', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const {
        audience = 'seller',
        reference_date = new Date().toISOString(),
        channels = ['email'],
        require_approval = true,
        due_at = null,
      } = req.body || {};

      const generated = await automationService.prepareWeeklyReport(txId, {
        audience,
        referenceDate: new Date(reference_date),
      });
      if (!generated.ok) return res.status(400).json(generated);

      const delivery = await automationService.prepareWeeklyReportDelivery(generated.report.id, {
        channels: Array.isArray(channels) ? channels : [channels],
        audience,
        sendNow: !require_approval,
      });

      let approvals = [];
      if (require_approval) {
        approvals = await queueCommunicationApprovals(txId, delivery.communications, {
          titlePrefix: 'Approve weekly report send',
          summary: 'Prepared weekly seller/agent update for delivery.',
          priority: 'normal',
          dueAt: due_at,
          actorMetadata: { report_id: generated.report.id, audience },
        });
      }

      res.status(201).json({ ok: true, report: generated.report, payload: generated.payload, delivery, approvals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/reports
  router.get('/transactions/:id/reports', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const items = await reportService.listReports(txId);
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/document-requests/:requestId/send
  router.post('/document-requests/:requestId/send', requireKey, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { channels = ['email'], send_now = true, require_approval = false, due_at = null } = req.body || {};
      const result = await automationService.sendDocumentRequest(requestId, {
        channels: Array.isArray(channels) ? channels : [channels],
        sendNow: !require_approval && send_now !== false,
      });
      if (!result.ok) return res.status(404).json(result);
      let approvals = [];
      if (require_approval && result.request?.transaction_id) {
        approvals = await queueCommunicationApprovals(result.request.transaction_id, result.communications, {
          titlePrefix: 'Approve document request send',
          summary: 'Prepared document request for client delivery.',
          priority: 'urgent',
          dueAt: due_at || result.request.due_at || null,
          actorMetadata: { request_id: requestId },
        });
      }
      res.json({ ok: true, ...result, approvals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions — manually create a transaction
  router.post('/transactions', requireKey, async (req, res) => {
    try {
      const {
        address, mls_number, purchase_price, agent_role, acceptance_date, close_date, parties,
        // fee fields
        waive_setup = false, setup_fee, closing_fee, closing_fee_note,
        client_name, client_email, client_phone,
      } = req.body || {};
      if (!address) return res.status(400).json({ ok: false, error: 'address is required' });

      const { computeKeyDates } = (await import('../services/tc-email-monitor.js')).createTCEmailMonitor?.({}) || {};
      const key_dates = acceptance_date
        ? { acceptance: acceptance_date, ...computeKeyDates?.(acceptance_date, close_date) || {} }
        : {};

      const row = await coordinator.insertTransaction({
        address, mls_number, purchase_price, agent_role,
        key_dates, close_date: close_date || key_dates.coe || null,
        parties: parties || {},
        notes: 'Manually created via API',
      });
      await coordinator.logEvent(row.id, 'created', { source: 'manual_api' });

      // Apply TC fees
      const { createTCPricing } = await import('../services/tc-pricing.js');
      const pricing = createTCPricing({ pool, logger });
      const fees = await pricing.applyToTransaction(row.id, {
        waivedSetup: !!waive_setup,
        customSetupFee:   setup_fee   != null ? parseFloat(setup_fee)   : undefined,
        customClosingFee: closing_fee != null ? parseFloat(closing_fee) : undefined,
        closingFeeNote: closing_fee_note,
        clientName: client_name, clientEmail: client_email, clientPhone: client_phone,
      });

      res.json({ ok: true, transaction: { ...row, ...fees } });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/process-email — parse email text and process as new contract
  router.post('/transactions/:id/process-email', requireKey, express.text({ limit: '500kb' }), async (req, res) => {
    try {
      const emailText = req.body;
      if (!emailText) return res.status(400).json({ ok: false, error: 'Email text required in body' });
      const result = await coordinator.processNewContract(emailText);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/process-email — process new contract from email text (no :id needed)
  router.post('/process-email', requireKey, express.text({ limit: '500kb' }), async (req, res) => {
    try {
      const emailText = req.body;
      if (!emailText) return res.status(400).json({ ok: false, error: 'Email text required in body' });
      const result = await coordinator.processNewContract(emailText);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/remind — manually trigger deadline reminder check
  router.post('/transactions/:id/remind', requireKey, async (req, res) => {
    try {
      const tx = await coordinator.getTransaction(parseInt(req.params.id));
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const result = await coordinator.checkDeadlines({ transactionId: tx.id });
      res.json({ ok: true, message: 'Deadline check triggered', ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/upload — upload document to TransactionDesk
  router.post('/transactions/:id/upload', requireKey, upload.single('document'), async (req, res) => {
    const tmpPath = req.file?.path;
    try {
      const tx = await coordinator.getTransaction(parseInt(req.params.id));
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      if (!tx.transaction_desk_id) {
        return res.status(400).json({ ok: false, error: 'Transaction not yet created in TransactionDesk' });
      }

      const docType = req.body?.docType || req.file?.originalname || 'document';
      const forceUpload = String(req.body?.force_upload || req.body?.forceUpload || 'false').toLowerCase() === 'true';
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createTCDocumentValidator } = await import('../services/tc-document-validator.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const validator = createTCDocumentValidator({ logger });
      const validation = await validator.validateFile({
        filePath: tmpPath,
        fileName: req.file.originalname,
        docType,
        expectedAddress: tx.address || null,
      });

      if (validation.blocks_upload && !forceUpload) {
        return res.status(409).json({ ok: false, blocked: true, error: 'Document validation blocked upload', validation });
      }

      const { session } = await tcBrowser.loginToGLVAR();
      await tcBrowser.ensureOnTransactionDesk(session);
      const result = await tcBrowser.uploadDocument(session, tx.transaction_desk_id, tmpPath, docType);
      await session.close?.();

      await coordinator.logEvent(tx.id, 'doc_uploaded', { docType, ok: result.ok, validation });
      res.json({ ok: true, validation, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      if (tmpPath) await fs.unlink(tmpPath).catch(() => {});
    }
  });

  // POST /api/v1/tc/transactions/:id/browser/td-sync-parties — scrape TD → merge parties JSONB
  router.post('/transactions/:id/browser/td-sync-parties', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const body = req.body || {};
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const result = await runTransactionDeskPartySync({
        coordinator,
        tcBrowser,
        logger,
        transactionId,
        dryRun: body.dry_run === true,
        overwriteParties: body.overwrite_parties === true,
        addressSearch: body.address_search || null,
      });
      if (!result.ok) return res.status(400).json(result);
      res.json({
        ...result,
        operator_note:
          'Scrape quality depends on ZipForm/TransactionDesk UI. Verify seller/buyer emails in the response; re-run with dry_run:false omitted and overwrite_parties:true only if you intend to replace existing party fields.',
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] td-sync-parties error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/browser/td-ui-plan — best-effort Forms / e-sign navigation + screenshots
  router.post('/transactions/:id/browser/td-ui-plan', requireKey, async (req, res) => {
    let session = null;
    try {
      const transactionId = parseInt(req.params.id, 10);
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const plan = String(req.body?.plan || 'inspection_seller_signing_prep').trim();
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const login = await tcBrowser.loginToGLVAR(false);
      session = login.session;
      await tcBrowser.ensureOnTransactionDesk(session);
      await tcBrowser.openTransactionDeskFile(session, {
        transactionDeskId: tx.transaction_desk_id,
        addressSearch: req.body?.address_search || tx.address,
      });
      const exec = await tcBrowser.applyTransactionDeskUiPlan(session, plan);
      await coordinator.logEvent(transactionId, 'td_ui_plan_executed', { plan, steps: exec.steps?.length });
      res.json({
        ok: true,
        plan,
        ...exec,
        disclaimer:
          'This does not complete e-sign or Nevada forms automatically. Use screenshots to confirm UI state; finish signing and coop distribution in TransactionDesk where required.',
        known_plans: Object.keys(tcBrowser.TD_UI_PLANS || {}),
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] td-ui-plan error');
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      await session?.close?.();
    }
  });

  // POST /api/v1/tc/transactions/:id/browser/td-workflow — async job (default) or sync: named TD bundles
  router.post('/transactions/:id/browser/td-workflow', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id, 10);
      if (Number.isNaN(txId)) return res.status(400).json({ ok: false, error: 'Invalid transaction id' });
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const body = req.body || {};
      const workflow = String(body.workflow || '').trim();
      if (!workflow) {
        return res.status(400).json({
          ok: false,
          error: 'workflow is required',
          catalog: tdWorkflowRunner.TD_WORKFLOW_CATALOG,
        });
      }

      if (body.async === false) {
        const steps = [];
        try {
          const result = await tdWorkflowRunner.runWorkflow(txId, workflow, body, (s) => steps.push(s));
          const failed = result.ok === false;
          return res.status(failed ? 400 : 200).json({
            ok: !failed,
            async: false,
            workflow,
            steps,
            result,
          });
        } catch (err) {
          return res.status(500).json({ ok: false, error: err.message, workflow, steps });
        }
      }

      pruneTdWorkflowJobs();
      const jobId = crypto.randomUUID();
      const job = {
        id: jobId,
        type: 'td_workflow',
        transaction_id: txId,
        workflow,
        status: 'queued',
        steps: [],
        error: null,
        result: null,
        created_at: new Date().toISOString(),
      };
      tdWorkflowJobs.set(jobId, job);

      res.status(202).json({
        ok: true,
        job_id: jobId,
        transaction_id: txId,
        workflow,
        poll_url: `/api/v1/tc/browser-jobs/${jobId}`,
        catalog_url: '/api/v1/tc/td-workflows/catalog',
      });

      (async () => {
        const j = tdWorkflowJobs.get(jobId);
        if (!j) return;
        j.status = 'running';
        try {
          const result = await tdWorkflowRunner.runWorkflow(txId, workflow, body, (step) => j.steps.push(step));
          const failed = result.ok === false;
          j.status = failed ? 'failed' : 'completed';
          j.result = result;
          if (failed) {
            j.error =
              result.result?.error ||
              result.sync?.error ||
              (result.sync && !result.sync.ok && 'party sync failed') ||
              'workflow failed';
          }
        } catch (err) {
          j.status = 'failed';
          j.error = err.message;
          j.steps.push({ at: new Date().toISOString(), label: 'job_failed', error: err.message });
          logger.warn?.({ err: err.message, jobId, workflow }, '[TC-ROUTES] td-workflow job failed');
        }
      })();
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] td-workflow enqueue error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/test-boldtrail — eXp Okta login → BoldTrail tile (same portal as SkySlope)
  router.post('/test-boldtrail', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false;
      const loginResult = await tcBrowser.loginToExpOkta(dryRun);

      if (dryRun || !loginResult.ok) {
        await loginResult.session?.close?.();
        return res.json({ ok: loginResult.ok, dryRun: true, screenshots: loginResult.screenshots });
      }

      const navResult = await tcBrowser.navigateToBoldTrail(loginResult.session);
      await loginResult.session?.close?.();

      res.json({ ok: true, boldTrailUrl: navResult.url, screenshots: [...loginResult.screenshots, ...navResult.screenshots] });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] test-boldtrail error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Document Intake ───────────────────────────────────────────────────────

  // POST /api/v1/tc/intake/run — search email, find executed RPA, upload to SkySlope
  router.post('/intake/run', requireKey, async (req, res) => {
    try {
      const { days = 90, address, dry_run = true } = req.body || {};
      const { createTCDocIntake } = await import('../services/tc-doc-intake.js');
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const intake = createTCDocIntake({ pool, tcBrowser, accountManager, logger });

      // Always dry_run=true first for safety unless explicitly set false
      const result = await intake.runFullIntake({ days, address, dryRun: dry_run !== false });
      res.json(result);
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] intake/run error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/intake/email-search — just search, don't upload
  router.post('/intake/email-search', requireKey, async (req, res) => {
    try {
      const { days = 90 } = req.body || {};
      const { createTCDocIntake } = await import('../services/tc-doc-intake.js');
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const intake = createTCDocIntake({ pool, tcBrowser, accountManager, logger });
      const emails = await intake.findExecutedAgreements({ days });
      res.json({
        ok: true,
        found: emails.length,
        emails: emails.map(e => ({
          subject: e.subject, from: e.from, date: e.date,
          isRPA: e.isRPA, isListing: e.isListing,
          files: e.files.map(f => ({ filename: f.filename, docType: f.docType, size: f.size })),
        })),
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] email-search error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/intake/validate — validate a document before filing
  router.post('/intake/validate', requireKey, upload.single('document'), async (req, res) => {
    const tmpPath = req.file?.path;
    try {
      if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded. Use multipart field "document"' });

      const docType = req.body?.doc_type || 'Transaction Document';
      const address = req.body?.address || null;
      const { createTCDocumentValidator } = await import('../services/tc-document-validator.js');
      const validator = createTCDocumentValidator({ logger });
      const validation = await validator.validateFile({
        filePath: tmpPath,
        fileName: req.file.originalname,
        docType,
        expectedAddress: address,
      });

      res.json({ ok: true, validation });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] intake/validate error');
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      if (tmpPath) await fs.unlink(tmpPath).catch(() => {});
    }
  });

  // POST /api/v1/tc/intake/upload — manual file upload (scanned docs, photos)
  // Send as multipart/form-data with field "document" (file) + "doc_type" + "address"
  router.post('/intake/upload', requireKey, upload.single('document'), async (req, res) => {
    const tmpPath = req.file?.path;
    try {
      if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded. Use multipart field "document"' });

      const docType  = req.body?.doc_type || 'Transaction Document';
      const address  = req.body?.address  || null;
      const dryRun   = req.body?.dry_run === 'true';
      const forceUpload = String(req.body?.force_upload || 'false').toLowerCase() === 'true';

      logger.info?.({ filename: req.file.originalname, docType, address, dryRun, forceUpload }, '[TC-ROUTES] Manual doc intake');

      const { createTCDocumentValidator } = await import('../services/tc-document-validator.js');
      const validator = createTCDocumentValidator({ logger });
      const validation = await validator.validateFile({
        filePath: tmpPath,
        fileName: req.file.originalname,
        docType,
        expectedAddress: address,
      });

      if (dryRun) {
        return res.json({ ok: true, dryRun: true, filename: req.file.originalname, docType, size: req.file.size, validation });
      }

      const { createTCDocIntake } = await import('../services/tc-doc-intake.js');
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const intake = createTCDocIntake({ pool, tcBrowser, accountManager, logger });

      const result = await intake.uploadToSkySlope(
        [{ filePath: tmpPath, filename: req.file.originalname, docType }],
        { address, validateBeforeUpload: true, forceUpload }
      );

      const statusCode = result.blocked ? 409 : 200;
      res.status(statusCode).json({ filename: req.file.originalname, docType, validation, ...result });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] intake/upload error');
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      if (tmpPath) await fs.unlink(tmpPath).catch(() => {});
    }
  });

  // POST /api/v1/tc/test-glvar-login — dry-run GLVAR MLS login (screenshots, no form submit)
  router.post('/test-glvar-login', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false; // default true — safe
      const result = await tcBrowser.loginToGLVAR(dryRun);
      await result.session?.close?.();

      res.json({ ok: true, dryRun: result.dryRun || false, screenshots: result.screenshots });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] test-glvar-login error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/test-skyslope-login — dry-run eXp Okta → SkySlope login
  router.post('/test-skyslope-login', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false; // default true — safe
      const loginResult = await tcBrowser.loginToExpOkta(dryRun);

      if (dryRun || !loginResult.ok) {
        await loginResult.session?.close?.();
        return res.json({ ok: loginResult.ok, dryRun: true, screenshots: loginResult.screenshots });
      }

      // Full: navigate to SkySlope via Okta dashboard
      const navResult = await tcBrowser.navigateToSkySlope(loginResult.session);
      await loginResult.session?.close?.();

      res.json({ ok: true, skySlopeUrl: navResult.url, screenshots: [...loginResult.screenshots, ...navResult.screenshots] });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] test-skyslope-login error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/browser/listing-to-skyslope — TD executed listing → SkySlope (async job)
  router.post('/transactions/:id/browser/listing-to-skyslope', requireKey, async (req, res) => {
    try {
      const txId = parseInt(req.params.id, 10);
      if (Number.isNaN(txId)) return res.status(400).json({ ok: false, error: 'Invalid transaction id' });
      const tx = await coordinator.getTransaction(txId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });

      const addressSearch =
        req.body?.address_search ||
        req.body?.addressSearch ||
        req.body?.search ||
        '';
      const dryRun = req.body?.dry_run !== false && req.body?.dryRun !== false; // default true
      const forceUpload =
        String(req.body?.force_upload || req.body?.forceUpload || '').toLowerCase() === 'true';
      const filenameHints = Array.isArray(req.body?.filename_hints) ? req.body.filename_hints : null;

      pruneListingSyncJobs();
      const jobId = crypto.randomUUID();
      const job = {
        id: jobId,
        transaction_id: txId,
        status: 'queued',
        steps: [],
        error: null,
        result: null,
        created_at: new Date().toISOString(),
        dry_run: dryRun,
      };
      listingTdSkyslopeJobs.set(jobId, job);

      res.status(202).json({
        ok: true,
        job_id: jobId,
        transaction_id: txId,
        dry_run: dryRun,
        poll_url: `/api/v1/tc/browser-jobs/${jobId}`,
        message: dryRun
          ? 'Dry run queued: opens TransactionDesk and matched file only.'
          : 'Live run queued: downloads executed listing agreement and uploads to SkySlope.',
      });

      (async () => {
        const j = listingTdSkyslopeJobs.get(jobId);
        if (!j) return;
        j.status = 'running';
        const accountManager = await getAccountManager();
        const { createTCListingSkyslopeSync } = await import('../services/tc-listing-skyslope-sync.js');
        const sync = createTCListingSkyslopeSync({ pool, coordinator, accountManager, logger });
        try {
          const result = await sync.run({
            transactionId: txId,
            addressSearch,
            filenameHints,
            dryRun,
            forceUpload,
            onStep: (step) => {
              j.steps.push(step);
            },
          });
          j.status = 'completed';
          j.result = result;
        } catch (err) {
          j.status = 'failed';
          j.error = err.message;
          logger.warn?.({ err: err.message, jobId }, '[TC-ROUTES] listing-to-skyslope job failed');
          j.steps.push({
            at: new Date().toISOString(),
            label: 'job_failed',
            error: err.message,
          });
        }
      })();
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] listing-to-skyslope enqueue error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/browser-jobs/:jobId — poll listing TD → SkySlope or TD workflow job
  router.get('/browser-jobs/:jobId', requireKey, async (req, res) => {
    const job = listingTdSkyslopeJobs.get(req.params.jobId) || tdWorkflowJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ ok: false, error: 'Job not found or expired' });
    res.json({ ok: true, job });
  });

  // GET /api/v1/tc/td-workflows/catalog — named TransactionDesk automation bundles
  router.get('/td-workflows/catalog', requireKey, async (_req, res) => {
    res.json({ ok: true, workflows: tdWorkflowRunner.TD_WORKFLOW_CATALOG });
  });

  // GET /api/v1/tc/td/forms-knowledge — persisted TD form inventory + handling playbooks
  router.get('/td/forms-knowledge', requireKey, async (req, res) => {
    try {
      const txId = req.query.transaction_id ? parseInt(req.query.transaction_id, 10) : null;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 300;
      const items = await tdFormKnowledgeService.listKnowledge({
        transactionId: Number.isFinite(txId) ? txId : null,
        limit,
      });
      res.json({ ok: true, count: items.length, items });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] td/forms-knowledge list error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/td/forms-knowledge/generate-playbooks — infer handling playbooks from machine schema
  router.post('/td/forms-knowledge/generate-playbooks', requireKey, async (req, res) => {
    try {
      const txId = req.body?.transaction_id != null ? parseInt(req.body.transaction_id, 10) : null;
      const limit = req.body?.limit != null ? parseInt(req.body.limit, 10) : 300;
      const overwrite = req.body?.overwrite === true;
      const result = await tdFormKnowledgeService.generatePlaybooks({
        transactionId: Number.isFinite(txId) ? txId : null,
        limit,
        overwrite,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] td/forms-knowledge generate-playbooks error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/td/forms-knowledge/:id/resolve-plan — apply template defaults + intent + per-case overrides
  router.post('/td/forms-knowledge/:id/resolve-plan', requireKey, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' });
      const result = await tdFormKnowledgeService.resolveExecutionPlan(id, {
        intent: req.body?.intent || 'standard',
        overrides: req.body?.overrides || {},
      });
      if (!result) return res.status(404).json({ ok: false, error: 'Form knowledge row not found' });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] td/forms-knowledge resolve-plan error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/td/forms-knowledge/:id — store how this form is handled in your workflow
  router.patch('/td/forms-knowledge/:id', requireKey, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' });
      const item = await tdFormKnowledgeService.updatePlaybook(
        id,
        req.body?.handling_playbook || {},
        req.body?.confidence,
        req.body?.machine_schema || null
      );
      if (!item) return res.status(404).json({ ok: false, error: 'Form knowledge row not found' });
      res.json({ ok: true, item });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] td/forms-knowledge patch error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── TC Fees + Agent Clients ───────────────────────────────────────────────

  async function getPricing() {
    const { createTCPricing } = await import('../services/tc-pricing.js');
    return createTCPricing({ pool, logger });
  }

  // GET /api/v1/tc/plans — all available pricing plans
  router.get('/plans', async (req, res) => {
    try {
      const { PLAN_DETAILS } = await import('../services/tc-pricing.js');
      res.json({ ok: true, plans: PLAN_DETAILS });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Agent Client Registry ────────────────────────────────────────────────

  // GET /api/v1/tc/clients — all agent clients
  router.get('/clients', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const clients = await pricing.listAgentClients({ activeOnly: req.query.all !== 'true' });
      res.json({ ok: true, count: clients.length, clients });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/clients — enroll a new agent client
  router.post('/clients', requireKey, async (req, res) => {
    try {
      const { name, email, phone, plan, waive_setup, setup_fee, monthly_fee, notes } = req.body || {};
      if (!name || !email) return res.status(400).json({ ok: false, error: 'name and email required' });

      const pricing = await getPricing();
      const client = await pricing.createAgentClient({
        name, email, phone, plan,
        waivedSetup:      !!waive_setup,
        customSetupFee:   setup_fee   != null ? parseFloat(setup_fee)   : undefined,
        customMonthlyFee: monthly_fee != null ? parseFloat(monthly_fee) : undefined,
        notes,
      });
      res.status(201).json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/clients/:id
  router.get('/clients/:id', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const client = await pricing.getAgentClient(
        isNaN(req.params.id) ? req.params.id : parseInt(req.params.id)
      );
      if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });
      res.json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/clients/:id/setup-paid — mark setup fee as received
  router.post('/clients/:id/setup-paid', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const client = await pricing.markSetupPaid(parseInt(req.params.id), {
        amountPaid: req.body?.amount ? parseFloat(req.body.amount) : undefined,
      });
      if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });
      res.json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/clients/:id/deactivate
  router.post('/clients/:id/deactivate', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const client = await pricing.deactivateClient(parseInt(req.params.id), req.body?.reason);
      if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });
      res.json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/fees/revenue — MRR, ARR, outstanding by plan
  router.get('/fees/revenue', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const summary = await pricing.getRevenueSummary();
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/fees/config — current default pricing
  router.get('/fees/config', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const config = await pricing.getConfig();
      res.json({ ok: true, config });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/fees/config — update default pricing
  router.patch('/fees/config', requireKey, async (req, res) => {
    try {
      const { default_setup_fee, default_closing_fee, waive_setup_allowed, min_closing_fee, notes } = req.body || {};
      const pricing = await getPricing();
      const config = await pricing.updateConfig({
        defaultSetupFee:   default_setup_fee   != null ? parseFloat(default_setup_fee)   : undefined,
        defaultClosingFee: default_closing_fee  != null ? parseFloat(default_closing_fee) : undefined,
        waiveSetupAllowed: waive_setup_allowed  != null ? !!waive_setup_allowed           : undefined,
        minClosingFee:     min_closing_fee      != null ? parseFloat(min_closing_fee)     : undefined,
        notes,
      });
      res.json({ ok: true, config });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/fees/summary — totals: earned, pending, outstanding
  router.get('/fees/summary', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const [summary, outstanding] = await Promise.all([
        pricing.getFeeSummary(),
        pricing.getOutstandingFees(),
      ]);
      res.json({ ok: true, summary, outstanding });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/transactions/:id/fees — update fees on an existing transaction
  router.patch('/transactions/:id/fees', requireKey, async (req, res) => {
    try {
      const { waive_setup, setup_fee, closing_fee, closing_fee_note, client_name, client_email, client_phone } = req.body || {};
      const pricing = await getPricing();
      const fees = await pricing.applyToTransaction(parseInt(req.params.id), {
        waivedSetup:      waive_setup  != null ? !!waive_setup                            : undefined,
        customSetupFee:   setup_fee    != null ? parseFloat(setup_fee)                    : undefined,
        customClosingFee: closing_fee  != null ? parseFloat(closing_fee)                  : undefined,
        closingFeeNote: closing_fee_note,
        clientName: client_name, clientEmail: client_email, clientPhone: client_phone,
      });
      if (!fees) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.json({ ok: true, fees });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/fees/collect — mark closing fee collected
  router.post('/transactions/:id/fees/collect', requireKey, async (req, res) => {
    try {
      const { amount_collected, notes } = req.body || {};
      const pricing = await getPricing();
      const tx = await pricing.markCollected(parseInt(req.params.id), {
        amountCollected: amount_collected ? parseFloat(amount_collected) : undefined,
        notes,
      });
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      await pool.query(
        `INSERT INTO tc_transaction_events (transaction_id, event_type, payload) VALUES ($1,'fee_collected',$2)`,
        [tx.id, JSON.stringify({ amount: amount_collected, notes })]
      ).catch(() => {});
      res.json({ ok: true, transaction: tx });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/fees/statement — plain-text fee statement
  router.get('/transactions/:id/fees/statement', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const statement = await pricing.generateFeeStatement(parseInt(req.params.id));
      if (!statement) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.type('text/plain').send(statement);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GLVAR Dues Monitor ────────────────────────────────────────────────────

  // GET /api/v1/tc/glvar/dues — last scraped dues status (no browser needed)
  router.get('/glvar/dues', requireKey, async (req, res) => {
    try {
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const monitor = createGLVARMonitor({ pool, logger });
      const dues = await monitor.getDuesStatus();
      const overdue  = dues.filter(d => d.daysUntilDue !== null && d.daysUntilDue < 0 && !d.paid_at);
      const upcoming = dues.filter(d => d.daysUntilDue !== null && d.daysUntilDue >= 0 && d.daysUntilDue <= 30 && !d.paid_at);
      res.json({ ok: true, dues, overdue, upcoming });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/check-dues — login, scrape, store, alert if needed
  router.post('/glvar/check-dues', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const notificationService = await getNotificationService();

      const monitor = createGLVARMonitor({ pool, tcBrowser, accountManager, notificationService, logger });
      const result = await monitor.checkDues();
      res.json(result);
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] check-dues error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/dues/:id/mark-paid — mark a dues item as paid
  router.post('/glvar/dues/:id/mark-paid', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE glvar_dues_log SET paid_at = NOW(), notes = $2 WHERE id = $1 RETURNING *`,
        [parseInt(req.params.id), req.body?.notes || null]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Dues entry not found' });
      res.json({ ok: true, dues: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/glvar/violations — recent violation notices detected
  router.get('/glvar/violations', requireKey, async (req, res) => {
    try {
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const monitor = createGLVARMonitor({ pool, logger });
      const violations = await monitor.getViolationsLog({ limit: parseInt(req.query.limit) || 50 });
      res.json({ ok: true, count: violations.length, violations });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/check-violations — run inbox scan now
  router.post('/glvar/check-violations', requireKey, async (req, res) => {
    try {
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const accountManager = await getAccountManager();
      const notificationService = await getNotificationService();
      const monitor = createGLVARMonitor({ pool, accountManager, notificationService, logger });
      const result = await monitor.checkViolationEmails();
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/violations/:id/resolve — mark a violation as resolved
  router.post('/glvar/violations/:id/resolve', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE glvar_violations_log SET resolved_at=NOW(), notes=$2 WHERE id=$1 RETURNING *`,
        [parseInt(req.params.id), req.body?.notes || null]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Violation not found' });
      res.json({ ok: true, violation: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Email Triage ──────────────────────────────────────────────────────────

  // GET /api/v1/tc/email/triage — get triaged emails (filterable)
  router.get('/email/triage', requireKey, async (req, res) => {
    try {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const triage = createEmailTriage({ pool, logger });
      const { category, action_required, limit, since } = req.query;
      const items = await triage.getTriagedEmails({
        category,
        actionRequired: action_required === 'true' ? true : action_required === 'false' ? false : undefined,
        limit: parseInt(limit) || 50,
        since,
      });
      const unactioned = items.filter(i => i.action_required && !i.actioned_at);
      res.json({ ok: true, count: items.length, unactioned: unactioned.length, items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/email/scan — trigger inbox scan now
  router.post('/email/scan', requireKey, async (req, res) => {
    try {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const accountManager = await getAccountManager();
      const notificationService = await getNotificationService();
      const triage = createEmailTriage({ pool, notificationService, callCouncilMember, accountManager, logger });
      const result = await triage.scanInbox();
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/email/triage/:id/action — mark an email as handled
  router.post('/email/triage/:id/action', requireKey, async (req, res) => {
    try {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const triage = createEmailTriage({ pool, logger });
      const item = await triage.markActioned(parseInt(req.params.id), req.body?.notes || null);
      if (!item) return res.status(404).json({ ok: false, error: 'Email not found' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/email/triage/:id/create-transaction', requireKey, async (req, res) => {
    try {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const triage = createEmailTriage({ pool, logger });
      const item = await triage.getTriagedEmail(parseInt(req.params.id, 10));
      if (!item) return res.status(404).json({ ok: false, error: 'Email not found' });
      if (item.category !== 'tc_contract') {
        return res.status(400).json({ ok: false, error: 'Only tc_contract emails can create a transaction' });
      }

      const emailText = [
        `Subject: ${item.subject || ''}`,
        `From: ${item.from_address || ''}`,
        `Preview: ${item.preview_text || ''}`,
        `Notes: ${item.notes || ''}`,
      ].join('\n');

      const result = await coordinator.processNewContract(emailText, item.message_id || item.uid || null);
      await triage.markActioned(
        item.id,
        [item.notes, `Transaction created from triage email -> #${result.transactionId}`].filter(Boolean).join(' | ')
      );
      res.json({ ok: true, item: await triage.getTriagedEmail(item.id), result });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] triage create transaction error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/email/triage/:id/link-transaction', requireKey, async (req, res) => {
    try {
      const triageId = parseInt(req.params.id, 10);
      const transactionId = parseInt(req.body?.transaction_id, 10);
      if (!Number.isInteger(transactionId)) {
        return res.status(400).json({ ok: false, error: 'transaction_id is required' });
      }

      const { createEmailTriage } = await import('../services/email-triage.js');
      const triage = createEmailTriage({ pool, logger });
      const item = await triage.getTriagedEmail(triageId);
      if (!item) return res.status(404).json({ ok: false, error: 'Email not found' });

      const transaction = await coordinator.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ ok: false, error: 'Transaction not found' });
      }

      const sourceEmailId = item.message_id || item.uid || null;
      if (sourceEmailId && !transaction.source_email_id) {
        await pool.query(
          `UPDATE tc_transactions SET source_email_id=$1, updated_at=NOW() WHERE id=$2`,
          [sourceEmailId, transactionId]
        );
      }

      await coordinator.logEvent(transactionId, 'triage_email_linked', {
        triage_id: item.id,
        category: item.category,
        subject: item.subject,
        from_address: item.from_address,
        preview_text: item.preview_text || '',
        message_id: item.message_id || null,
        uid: item.uid || null,
        linked_by: req.body?.actor || 'tc_intake_workspace',
      });

      const note = `Triaged email linked to transaction #${transactionId}`;
      await triage.markActioned(item.id, [item.notes, note].filter(Boolean).join(' | '));

      res.json({
        ok: true,
        item: await triage.getTriagedEmail(item.id),
        transaction: await coordinator.getTransaction(transactionId),
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] triage link transaction error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/email/send-attachment-package
  // Finds a matching email, combines photo attachments into one PDF, and emails it out.
  router.post('/email/send-attachment-package', requireKey, async (req, res) => {
    try {
      const {
        transaction_id = null,
        recipient_email,
        recipient_name = '',
        subject,
        body,
        search = {},
        combine_photos = true,
        attach_originals = false,
        dry_run = false,
      } = req.body || {};

      const result = await emailDocumentService.sendAttachmentPackage({
        transactionId: transaction_id ? parseInt(transaction_id, 10) : null,
        recipientEmail: recipient_email,
        recipientName: recipient_name,
        subject,
        body,
        search,
        combinePhotos: combine_photos !== false,
        attachOriginals: !!attach_originals,
        dryRun: !!dry_run,
      });

      if (!result.ok) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] email/send-attachment-package error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/email/preview-inspection-mailbox — IMAP search only (no downloads)
  router.post('/transactions/:id/email/preview-inspection-mailbox', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const search = buildInspectionMailboxSearch(tx, req.body || {});
      const derived_hints = deriveMailboxSearchFromTransactionAddress(tx.address);
      const emails = await emailDocumentService.findAttachmentEmails(search);
      res.json({
        ok: true,
        transaction_id: transactionId,
        address: tx.address,
        search,
        derived_hints,
        matches: emails.map((e) => ({
          uid: e.uid,
          subject: e.subject,
          from: e.from,
          date: e.date,
          part_count: (e.parts || []).length,
        })),
        count: emails.length,
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] preview-inspection-mailbox error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/email/gather-inspection-attachments — download PDFs from all matching messages
  router.post('/transactions/:id/email/gather-inspection-attachments', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const search = buildInspectionMailboxSearch(tx, req.body || {});
      const onlyPdf = req.body?.only_pdf !== false;
      const { emails, files } = await emailDocumentService.gatherAttachmentsForSearch(search, { onlyPdf });
      res.json({
        ok: true,
        transaction_id: transactionId,
        search,
        emails_scanned: emails.length,
        attachment_count: files.length,
        files: files.map((f) => ({
          filename: f.filename,
          size: f.size,
          source_uid: f.source_uid,
          source_subject: f.source_subject,
          source_from: f.source_from,
          filePath: f.filePath,
        })),
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] gather-inspection-attachments error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/email/prepare-inspection-forward-approval — queue approval (review → approve to send)
  router.post('/transactions/:id/email/prepare-inspection-forward-approval', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      let tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const body = req.body || {};

      let td_party_sync = null;
      if (body.sync_td_parties_first === true && (tx.transaction_desk_id || tx.address)) {
        const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
        const accountManager = await getAccountManager();
        const tcBrowser = createTCBrowserAgent({ accountManager, logger });
        td_party_sync = await runTransactionDeskPartySync({
          coordinator,
          tcBrowser,
          logger,
          transactionId,
          dryRun: body.td_party_sync_dry_run === true,
          overwriteParties: body.overwrite_td_parties === true,
          addressSearch: body.td_address_search || null,
        });
        if (td_party_sync.ok) {
          tx = await coordinator.getTransaction(transactionId);
        }
      }

      const resolved = await inspectionForwardService.resolveSellerRecipient(tx, body);
      if (!resolved.email) {
        return res.status(400).json({
          ok: false,
          error: 'Could not resolve seller / client email',
          resolution: resolved,
        });
      }

      const search = buildInspectionMailboxSearch(tx, body);
      const emails = await emailDocumentService.findAttachmentEmails(search);
      const preview_attachments = [];
      for (const e of emails) {
        for (const p of e.parts || []) {
          preview_attachments.push({ filename: p.filename, source_subject: e.subject, uid: e.uid });
        }
      }

      const recipient_name = body.recipient_name || resolved.name || '';
      const subjectLine =
        body.subject ||
        `${(tx.address || 'Property').replace(/\s+/g, ' ').trim()} — Inspection documents (seller client copy)`;
      const forwardBody = buildInspectionForwardEmailBody({
        recipientName: recipient_name,
        narrative: body.narrative || '',
        buyerPositionSummary: body.buyer_position_summary,
        transaction: tx,
      });

      const requires_listing_agent_signature = body.requires_listing_agent_signature === true;
      const prepared_action = {
        kind: 'forward_inspection_docs',
        search,
        only_pdf: body.only_pdf !== false,
        recipient_email: resolved.email,
        recipient_name,
        subject: subjectLine,
        body: forwardBody,
        requires_listing_agent_signature,
        upload_to_td: body.upload_to_td === true,
        force_upload: String(body.force_upload || '').toLowerCase() === 'true',
        doc_type_prefix: String(body.doc_type_prefix || 'Inspection (mailbox)').trim() || 'Inspection (mailbox)',
      };

      const approval = await approvalService.createApproval(transactionId, {
        category: 'document',
        title: `Review & send inspection package — ${tx.address}`,
        summary: `To ${recipient_name || resolved.email} <${resolved.email}> · ${preview_attachments.length} attachment(s) across ${emails.length} message(s)${
          requires_listing_agent_signature
            ? ' · on approve: append listing-agent acknowledgment pages to PDFs (see env TC_LISTING_AGENT_*)'
            : ''
        }`,
        priority: body.priority || 'urgent',
        prepared_action,
        metadata: {
          recipient_resolution: resolved,
          preview_messages: emails.map((e) => ({
            uid: e.uid,
            subject: e.subject,
            attachment_filenames: (e.parts || []).map((part) => part.filename),
          })),
          preview_attachment_count: preview_attachments.length,
        },
      });

      const playbook = tdInspectionForwardPlaybook(recipient_name);
      await coordinator.logEvent(transactionId, 'inspection_forward_prepared', { approval_id: approval.id });

      res.json({
        ok: true,
        approval,
        recipient: resolved,
        preview: {
          message_count: emails.length,
          attachment_count: preview_attachments.length,
          attachments: preview_attachments,
        },
        prepared_action,
        subject: subjectLine,
        body_preview: forwardBody,
        transaction_desk_playbook: playbook,
        sign_off_hint:
          'Edit drafts via PATCH /api/v1/tc/approvals/:id (prepared_action). When ready, PATCH with { "action": "approve", "actor": "your_name" } to gather fresh attachments, stamp PDFs if requested, send email, and optionally upload to TD.',
        td_party_sync,
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] prepare-inspection-forward-approval error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/email/forward-inspection-docs — multi-email PDF package (direct send; optional auto-resolve seller email)
  router.post('/transactions/:id/email/forward-inspection-docs', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      let tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });

      const body = req.body || {};
      if (body.sync_td_parties_first === true && (tx.transaction_desk_id || tx.address)) {
        const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
        const accountManager = await getAccountManager();
        const tcBrowser = createTCBrowserAgent({ accountManager, logger });
        const sync = await runTransactionDeskPartySync({
          coordinator,
          tcBrowser,
          logger,
          transactionId,
          dryRun: body.td_party_sync_dry_run === true,
          overwriteParties: body.overwrite_td_parties === true,
          addressSearch: body.td_address_search || null,
        });
        if (sync.ok) tx = await coordinator.getTransaction(transactionId);
      }
      let recipient_email = body.recipient_email;
      let recipient_name = body.recipient_name || '';
      let resolution = null;
      if (!recipient_email) {
        resolution = await inspectionForwardService.resolveSellerRecipient(tx, body);
        if (resolution.email) {
          recipient_email = resolution.email;
          recipient_name = recipient_name || resolution.name || '';
        }
      }

      const {
        narrative = '',
        buyer_position_summary,
        subject,
        dry_run = true,
      } = body;

      if (!recipient_email) {
        return res.status(400).json({
          ok: false,
          error: 'recipient_email is required (or resolvable seller via parties.seller.email / Sent-mail search)',
          resolution,
        });
      }

      const search = buildInspectionMailboxSearch(tx, req.body || {});
      const onlyPdf = req.body?.only_pdf !== false;
      const subjectLine =
        subject ||
        `${(tx.address || 'Property').replace(/\s+/g, ' ').trim()} — Inspection documents & buyer direction`;

      const emailBody = buildInspectionForwardEmailBody({
        recipientName: recipient_name,
        narrative,
        buyerPositionSummary: buyer_position_summary,
        transaction: tx,
      });

      const playbook = tdInspectionForwardPlaybook(recipient_name);

      const result = await emailDocumentService.sendGatheredAttachmentPackage({
        transactionId,
        recipientEmail: recipient_email,
        recipientName: recipient_name,
        subject: subjectLine,
        body: emailBody,
        search,
        onlyPdf,
        dryRun: dry_run !== false,
      });

      await coordinator.logEvent(transactionId, 'inspection_mailbox_forward', {
        dry_run: dry_run !== false,
        recipient_email,
        search,
        attachment_count: result.attachment_count ?? result.metadata?.attachments?.length,
        ok: result.ok,
        error: result.error || null,
      });

      if (!result.ok) {
        return res.status(400).json({
          ...result,
          transaction_desk_playbook: playbook,
          subject: subjectLine,
          recipient_resolution: resolution,
        });
      }

      res.json({
        ...result,
        transaction_desk_playbook: playbook,
        subject: subjectLine,
        recipient_resolution: resolution,
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] forward-inspection-docs error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/email/upload-gathered-to-td — gather mailbox PDFs and upload each to TD
  router.post('/transactions/:id/email/upload-gathered-to-td', requireKey, async (req, res) => {
    const transactionId = parseInt(req.params.id, 10);
    let session = null;
    try {
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      if (!tx.transaction_desk_id) {
        return res.status(400).json({ ok: false, error: 'Transaction not yet linked to TransactionDesk' });
      }

      const search = buildInspectionMailboxSearch(tx, req.body || {});
      const onlyPdf = req.body?.only_pdf !== false;
      const forceUpload =
        String(req.body?.force_upload || req.body?.forceUpload || 'false').toLowerCase() === 'true';
      const docTypePrefix = String(req.body?.doc_type_prefix || 'Inspection (mailbox)').trim() || 'Inspection (mailbox)';

      const { emails, files } = await emailDocumentService.gatherAttachmentsForSearch(search, { onlyPdf });
      if (!files.length) {
        return res.status(400).json({
          ok: false,
          error: 'No attachments matched the search',
          emails_scanned: emails.length,
          search,
        });
      }

      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createTCDocumentValidator } = await import('../services/tc-document-validator.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const validator = createTCDocumentValidator({ logger });

      const login = await tcBrowser.loginToGLVAR();
      session = login.session;
      await tcBrowser.ensureOnTransactionDesk(session);

      const results = [];
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
        });
      }

      await session?.close?.();
      session = null;

      const playbook = tdInspectionForwardPlaybook();

      res.json({
        ok: true,
        transaction_id: transactionId,
        search,
        emails_scanned: emails.length,
        uploaded: results.filter((r) => r.ok).length,
        results,
        transaction_desk_playbook: playbook,
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] upload-gathered-to-td error');
      await session?.close?.();
      res.status(500).json({ ok: false, error: err.message });
    }
  });


  // POST /api/v1/tc/transactions/:id/r4r/scan — find inspection report + repair request files in mailbox
  router.post('/transactions/:id/r4r/scan', requireKey, async (req, res) => {
    let session = null;
    try {
      const transactionId = parseInt(req.params.id, 10);
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });

      const search = buildR4RMailboxSearch(tx, req.body || {});
      const onlyPdf = req.body?.only_pdf !== false;
      const { emails, files } = await emailDocumentService.gatherAttachmentsForSearch(search, { onlyPdf });
      const classified = files.map((f) => ({
        ...f,
        r4r_role: classifyR4RAttachment(f.filename),
      }));
      const hasRepairRequest = classified.some((f) => f.r4r_role === 'repair_request');
      const hasInspectionReport = classified.some((f) => f.r4r_role === 'inspection_report');

      let td_upload = null;
      if (req.body?.upload_to_td === true) {
        const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
        const { createTCDocumentValidator } = await import('../services/tc-document-validator.js');
        const accountManager = await getAccountManager();
        const tcBrowser = createTCBrowserAgent({ accountManager, logger });
        const validator = createTCDocumentValidator({ logger });
        const forceUpload =
          String(req.body?.force_upload || req.body?.forceUpload || 'false').toLowerCase() === 'true';
        const docTypePrefix = String(req.body?.doc_type_prefix || 'R4R package').trim() || 'R4R package';
        const dryRunUpload = req.body?.dry_run_upload === true;
        const uploadSellerRejectionPdf = req.body?.upload_seller_rejection_pdf !== false;

        const results = [];
        if (dryRunUpload) {
          for (const file of classified) {
            const docType = `${docTypePrefix} — ${file.r4r_role} — ${file.filename}`;
            const validation = await validator.validateFile({
              filePath: file.filePath,
              fileName: file.filename,
              docType,
              expectedAddress: tx.address || null,
            });
            results.push({
              filename: file.filename,
              r4r_role: file.r4r_role,
              ok: true,
              dry_run_upload: true,
              validation,
            });
          }
          td_upload = {
            ok: true,
            dry_run_upload: true,
            uploaded: 0,
            results,
          };
        } else {
          const login = await tcBrowser.loginToGLVAR(false);
          session = login.session;
          await tcBrowser.ensureOnTransactionDesk(session);

          let deskId = tx.transaction_desk_id ? String(tx.transaction_desk_id).trim() : '';
          if (!deskId && String(tx.address || '').trim()) {
            try {
              await tcBrowser.openTransactionDeskFile(session, {
                addressSearch: String(tx.address).trim(),
              });
              const url = session.page.url();
              const tdIdMatch =
                url.match(/transaction[s]?\/(\d+)/i) || url.match(/[?&#]id=(\d+)/i);
              const found = tdIdMatch?.[1] || null;
              if (found) {
                deskId = found;
                await pool.query(
                  'UPDATE tc_transactions SET transaction_desk_id=$1, updated_at=NOW() WHERE id=$2',
                  [deskId, transactionId]
                );
                await coordinator.logEvent(transactionId, 'transaction_desk_linked', {
                  transaction_desk_id: deskId,
                  source: 'r4r_scan_address_open',
                });
              }
            } catch (e) {
              logger.warn?.({ err: e.message }, '[TC-ROUTES] r4r/scan TD open by address failed');
            }
          }

          if (deskId) {
            try {
              await tcBrowser.openTransactionDeskFile(session, { transactionDeskId: deskId });
            } catch (e) {
              logger.warn?.({ err: e.message }, '[TC-ROUTES] r4r/scan TD open by id follow-up failed');
            }
          }

          if (!deskId) {
            td_upload = {
              ok: false,
              skipped: true,
              error:
                'Transaction not linked to TransactionDesk; address search did not resolve a desk id — set transaction_desk_id or confirm TD search finds this property',
            };
          } else {
            for (const file of classified) {
              const docType = `${docTypePrefix} — ${file.r4r_role} — ${file.filename}`;
              const validation = await validator.validateFile({
                filePath: file.filePath,
                fileName: file.filename,
                docType,
                expectedAddress: tx.address || null,
              });
              if (validation.blocks_upload && !forceUpload) {
                results.push({ filename: file.filename, r4r_role: file.r4r_role, skipped: true, validation });
                continue;
              }
              const up = await tcBrowser.uploadDocument(session, deskId, file.filePath, docType);
              results.push({
                filename: file.filename,
                r4r_role: file.r4r_role,
                ok: up.ok,
                validation,
                upload: up,
              });
            }

            if (uploadSellerRejectionPdf && deskId) {
              const tmpRej = `/tmp/tc-r4r-seller-rej-${transactionId}-${Date.now()}.pdf`;
              try {
                await writeSellerRejectionSummaryPdf({
                  address: tx.address,
                  transactionId,
                  outPath: tmpRej,
                });
                const rejDocType = `${docTypePrefix} — seller_response — Seller REJECTED repair request (LifeOS summary)`;
                const upRej = await tcBrowser.uploadDocument(session, deskId, tmpRej, rejDocType);
                results.push({
                  filename: '_seller_rejection_summary.pdf',
                  r4r_role: 'seller_response',
                  ok: upRej.ok,
                  upload: upRej,
                });
              } catch (e) {
                logger.warn?.({ err: e.message }, '[TC-ROUTES] r4r/scan seller rejection pdf failed');
                results.push({
                  filename: '_seller_rejection_summary.pdf',
                  r4r_role: 'seller_response',
                  ok: false,
                  error: e.message,
                });
              } finally {
                await fs.unlink(tmpRej).catch(() => {});
              }
            }

            td_upload = {
              ok: true,
              dry_run_upload: false,
              transaction_desk_id: deskId,
              uploaded: results.filter((r) => r.ok && !r.skipped && r.r4r_role !== 'seller_response').length,
              uploaded_including_summary: results.filter((r) => r.ok && !r.skipped).length,
              results,
            };
          }
        }
      }

      await coordinator.logEvent(transactionId, 'r4r_scan', {
        search,
        emails_scanned: emails.length,
        attachments: classified.length,
        has_repair_request: hasRepairRequest,
        has_inspection_report: hasInspectionReport,
        upload_to_td: req.body?.upload_to_td === true,
      });

      res.json({
        ok: true,
        transaction_id: transactionId,
        search,
        emails_scanned: emails.length,
        attachment_count: classified.length,
        has_repair_request: hasRepairRequest,
        has_inspection_report: hasInspectionReport,
        files: classified.map((f) => ({
          filename: f.filename,
          size: f.size,
          r4r_role: f.r4r_role,
          source_uid: f.source_uid,
          source_subject: f.source_subject,
          source_from: f.source_from,
          filePath: f.filePath,
        })),
        td_upload,
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] r4r/scan error');
      res.status(500).json({
        ok: false,
        error: err.message,
        self_service_apis: {
          tc_access_readiness: 'GET /api/v1/tc/access/readiness',
          railway_env_mask: 'GET /api/v1/railway/env',
          railway_env_bulk: 'POST /api/v1/railway/env/bulk',
          managed_env_sync: 'POST /api/v1/railway/managed-env/sync',
          railway_redeploy: 'POST /api/v1/railway/deploy',
        },
        note:
          'Use the same command key as other TC APIs — automation can read/set env and redeploy without the Railway web UI.',
      });
    } finally {
      await session?.close?.();
    }
  });

  // POST /api/v1/tc/transactions/:id/r4r/send-seller-review — queue seller review package with call script
  router.post('/transactions/:id/r4r/send-seller-review', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });

      const body = req.body || {};
      const narrative = body.narrative ||
        'Please review the attached inspection report and repair request. Read through what the buyers are asking for, then call me and we will go over your response options together (accept, reject, or counter).';

      const proxyBody = {
        ...body,
        narrative,
        subject:
          body.subject ||
          `${(tx.address || 'Property').replace(/\s+/g, ' ').trim()} — Seller review: inspection + repair request`,
        sync_td_parties_first: body.sync_td_parties_first !== false,
      };

      const search = buildR4RMailboxSearch(tx, proxyBody);
      const resolved = await inspectionForwardService.resolveSellerRecipient(tx, proxyBody);
      if (!resolved.email) {
        return res.status(400).json({ ok: false, error: 'Could not resolve seller email', resolution: resolved });
      }

      const recipient_name = proxyBody.recipient_name || resolved.name || '';
      const forwardBody = buildInspectionForwardEmailBody({
        recipientName: recipient_name,
        narrative: proxyBody.narrative,
        buyerPositionSummary:
          proxyBody.buyer_position_summary ||
          'This package contains the buyer inspection report and repair request. Please review and we will discuss your preferred response (accept, reject, or counter).',
        transaction: tx,
      });

      const approval = await approvalService.createApproval(transactionId, {
        category: 'document',
        title: `R4R seller review send — ${tx.address}`,
        summary: `Send inspection + repair request package to seller ${recipient_name || resolved.email} and request a call before response drafting.`,
        priority: proxyBody.priority || 'urgent',
        prepared_action: {
          kind: 'forward_inspection_docs',
          search,
          only_pdf: proxyBody.only_pdf !== false,
          recipient_email: resolved.email,
          recipient_name,
          subject: proxyBody.subject,
          body: forwardBody,
          requires_listing_agent_signature: proxyBody.requires_listing_agent_signature === true,
          upload_to_td: proxyBody.upload_to_td === true,
          force_upload: String(proxyBody.force_upload || '').toLowerCase() === 'true',
          doc_type_prefix: String(proxyBody.doc_type_prefix || 'R4R package').trim() || 'R4R package',
        },
        metadata: {
          flow: 'r4r_seller_review',
          seller_email_source: resolved.source,
        },
      });

      res.json({
        ok: true,
        approval,
        recipient: resolved,
        sign_off_hint:
          'Approve this item via PATCH /api/v1/tc/approvals/:id with {"action":"approve"} to send to seller. Then capture seller decision via POST /api/v1/tc/transactions/:id/r4r/record-seller-choice.',
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] r4r/send-seller-review error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/r4r/record-seller-choice — accept | reject | counter
  router.post('/transactions/:id/r4r/record-seller-choice', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });

      const { choice, notes = null, counter_offer = null, source_channel = 'manual' } = req.body || {};
      const map = { accept: 'accepted', accepted: 'accepted', reject: 'rejected', rejected: 'rejected', counter: 'counter', proposal: 'counter' };
      const response = map[String(choice || '').toLowerCase()];
      if (!response) {
        return res.status(400).json({
          ok: false,
          error: 'choice is required: accept | reject | counter',
        });
      }

      const inspection = await inspectionService.recordRepairResponse(transactionId, {
        response,
        counterOffer: counter_offer,
        responseNotes: notes,
      });

      const reviewApproval = await approvalService.createApproval(transactionId, {
        category: 'communication',
        title: `R4R response review — ${tx.address}`,
        summary:
          response === 'counter'
            ? 'Seller proposed a counter on repair response. Review with buyer side and finalize send.'
            : response === 'accepted'
              ? 'Seller accepted repair request terms. Review and finalize buyer-side communication.'
              : 'Seller rejected repair request. Review buyer options (accept as-is or cancel) and finalize communication.',
        priority: 'urgent',
        metadata: {
          flow: 'r4r_response_review',
          seller_choice: response,
          source_channel,
          notes,
        },
      });

      await coordinator.logEvent(transactionId, 'r4r_seller_choice_recorded', {
        choice: response,
        source_channel,
      });

      res.json({
        ok: true,
        inspection,
        review_approval: reviewApproval,
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] r4r/record-seller-choice error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/r4r/test-reject-all — first test flow with template override
  router.post('/transactions/:id/r4r/test-reject-all', requireKey, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id, 10);
      const tx = await coordinator.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const body = req.body || {};

      const search = buildR4RMailboxSearch(tx, body);
      const onlyPdf = body.only_pdf !== false;
      const { emails, files } = await emailDocumentService.gatherAttachmentsForSearch(search, { onlyPdf });
      const classified = files.map((f) => ({ ...f, r4r_role: classifyR4RAttachment(f.filename) }));
      const hasRepairRequest = classified.some((f) => f.r4r_role === 'repair_request');
      const hasInspectionReport = classified.some((f) => f.r4r_role === 'inspection_report');
      const strictRoles = body.strict_attachment_roles !== false;

      if (strictRoles && (!hasRepairRequest || !hasInspectionReport)) {
        return res.status(400).json({
          ok: false,
          error: 'R4R test requires both repair request and inspection report attachments (set strict_attachment_roles:false to stage approval with whatever PDFs matched)',
          has_repair_request: hasRepairRequest,
          has_inspection_report: hasInspectionReport,
          attachment_count: classified.length,
        });
      }
      if (!strictRoles && classified.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No PDF attachments matched the mailbox search; widen days/subject_contains or fix IMAP',
          search,
        });
      }

      const knowledgeRows = await tdFormKnowledgeService.listKnowledge({ transactionId, limit: 500 });
      let templateRow =
        body.template_form_id != null
          ? knowledgeRows.find((k) => k.id === Number(body.template_form_id))
          : null;
      if (!templateRow) {
        templateRow = knowledgeRows.find((k) => {
          const n = String(k.form_name || '').toLowerCase();
          return /repair|r4r|inspection.*response|counter|request.*repair/.test(n);
        }) || null;
      }

      let resolvedTemplate = null;
      if (templateRow) {
        resolvedTemplate = await tdFormKnowledgeService.resolveExecutionPlan(templateRow.id, {
          intent: 'reject_all_repairs',
          overrides: body.template_overrides || {
            decision_mode: 'reject_all_repairs',
            template_defaults: {
              send_mode: 'approval_required',
              doc_type_prefix: 'R4R response package',
            },
            response_copy:
              'Seller declines all requested repairs and credits at this time. We are ready to continue under the current contract terms unless buyer elects otherwise.',
          },
        });
      }

      const notes =
        body.notes ||
        'Seller elected to reject all requested repairs for this test scenario. Prepare buyer-facing response package for review before release.';
      const relaxedWarning =
        !strictRoles && (!hasRepairRequest || !hasInspectionReport)
          ? 'strict_attachment_roles was false: missing repair_request or inspection_report filename hints—verify PDFs manually before buyer send.'
          : null;
      const reviewApproval = await approvalService.createApproval(transactionId, {
        category: 'document',
        title: `R4R reject-all test plan — ${tx.address}`,
        summary:
          'R4R attachments identified and template override resolved. Review package + copy, then approve buyer-side response routing.' +
          (relaxedWarning ? ` ${relaxedWarning}` : ''),
        priority: 'urgent',
        metadata: {
          flow: 'r4r_reject_all_test',
          strict_attachment_roles: strictRoles,
          attachment_roles_warning: relaxedWarning,
          attachments_found: classified.length,
          has_repair_request: hasRepairRequest,
          has_inspection_report: hasInspectionReport,
          source_messages: emails.map((e) => ({ uid: e.uid, subject: e.subject })),
          template_form_id: templateRow?.id || null,
          template_plan: resolvedTemplate?.plan || null,
          notes,
        },
      });

      await coordinator.logEvent(transactionId, 'r4r_reject_all_test_prepared', {
        approval_id: reviewApproval.id,
        template_form_id: templateRow?.id || null,
      });

      res.json({
        ok: true,
        transaction_id: transactionId,
        search,
        emails_scanned: emails.length,
        attachment_count: classified.length,
        files: classified.map((f) => ({
          filename: f.filename,
          r4r_role: f.r4r_role,
          source_subject: f.source_subject,
          filePath: f.filePath,
        })),
        template_form: templateRow
          ? {
              id: templateRow.id,
              form_name: templateRow.form_name,
            }
          : null,
        template_plan: resolvedTemplate?.plan || null,
        strict_attachment_roles: strictRoles,
        attachment_roles_warning: relaxedWarning,
        review_approval: reviewApproval,
        next_step:
          'After review, record seller decision via POST /api/v1/tc/transactions/:id/r4r/record-seller-choice with { "choice":"reject", "notes":"..." } then run buyer-side response approval/send.',
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] r4r/test-reject-all error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/test-glvar-mls — login to GLVAR then navigate to MLS
  router.post('/test-glvar-mls', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false;
      const loginResult = await tcBrowser.loginToGLVAR(dryRun);

      if (dryRun || !loginResult.ok) {
        await loginResult.session?.close?.();
        return res.json({ ok: loginResult.ok, dryRun: true, screenshots: loginResult.screenshots });
      }

      const navResult = await tcBrowser.navigateToMLS(loginResult.session);
      await loginResult.session?.close?.();
      res.json({ ok: true, mlsUrl: navResult.url, screenshots: [...loginResult.screenshots, ...navResult.screenshots] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Inspection routes ─────────────────────────────────────────────────────
  // GET  /api/v1/tc/transactions/:id/inspection          — current state + contingency countdown
  // POST /api/v1/tc/transactions/:id/inspection/schedule — record inspector + scheduled date
  // POST /api/v1/tc/transactions/:id/inspection/report   — mark report received + findings
  // POST /api/v1/tc/transactions/:id/inspection/decision — accept_as_is | repair_request | reject_and_cancel
  // POST /api/v1/tc/transactions/:id/inspection/repair-response — seller responds to repair request
  // POST /api/v1/tc/transactions/:id/inspection/send-cancellation — mark cancellation notice sent

  router.get('/transactions/:id/inspection', requireKey, async (req, res) => {
    try {
      const status = await inspectionService.getStatus(req.params.id);
      res.json({ ok: true, ...status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transactions/:id/inspection/schedule', requireKey, async (req, res) => {
    const { inspector_name, inspector_company, inspector_phone, inspector_email, scheduled_at } = req.body;
    if (!inspector_name || !scheduled_at) {
      return res.status(400).json({ ok: false, error: 'inspector_name and scheduled_at are required' });
    }
    try {
      const row = await inspectionService.schedule(req.params.id, {
        inspectorName: inspector_name,
        inspectorCompany: inspector_company,
        inspectorPhone: inspector_phone,
        inspectorEmail: inspector_email,
        scheduledAt: scheduled_at,
      });
      res.json({ ok: true, inspection: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transactions/:id/inspection/report', requireKey, async (req, res) => {
    const { completed_at, report_url, findings_summary, findings_items } = req.body;
    try {
      const row = await inspectionService.receiveReport(req.params.id, {
        completedAt: completed_at,
        reportUrl: report_url,
        findingsSummary: findings_summary,
        findingsItems: findings_items || [],
      });
      res.json({ ok: true, inspection: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transactions/:id/inspection/decision', requireKey, async (req, res) => {
    const { decision, decision_notes, repair_request_items, repair_response_deadline } = req.body;
    if (!decision) return res.status(400).json({ ok: false, error: 'decision is required' });
    try {
      const row = await inspectionService.decide(req.params.id, {
        decision,
        decisionNotes: decision_notes,
        repairRequestItems: repair_request_items || [],
        repairResponseDeadline: repair_response_deadline,
      });
      res.json({ ok: true, inspection: row });
    } catch (err) {
      res.status(err.message.includes('Invalid decision') ? 400 : 500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transactions/:id/inspection/repair-response', requireKey, async (req, res) => {
    const { response, counter_offer, response_notes } = req.body;
    if (!response) return res.status(400).json({ ok: false, error: 'response is required' });
    try {
      const row = await inspectionService.recordRepairResponse(req.params.id, {
        response,
        counterOffer: counter_offer,
        responseNotes: response_notes,
      });
      res.json({ ok: true, inspection: row });
    } catch (err) {
      res.status(err.message.includes('Invalid') ? 400 : 500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transactions/:id/inspection/send-cancellation', requireKey, async (req, res) => {
    try {
      const row = await inspectionService.markCancellationNoticeSent(req.params.id);
      res.json({ ok: true, inspection: row, cancellation_notice: row.cancellation_notice_text });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/tc', router);
  logger.info?.('✅ [TC-ROUTES] Mounted at /api/v1/tc');
}

export default createTCRoutes;
