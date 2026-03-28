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

const upload = multer({ dest: '/tmp/tc-uploads/' });
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

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
  const approvalService = createTCApprovalService({ pool, coordinator, automationService, logger });
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
      await tcBrowser.navigateToTransactionDesk(session);
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
