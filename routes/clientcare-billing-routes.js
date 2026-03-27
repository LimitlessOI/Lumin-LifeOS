/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-billing-routes.js
 * ClientCare billing rescue, browser fallback readiness, and claim action queue.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { createClientCareBillingService } from '../services/clientcare-billing-service.js';
import { createClientCareBrowserService } from '../services/clientcare-browser-service.js';
import { createClientCareOpsService } from '../services/clientcare-ops-service.js';
import { createClientCareSyncService } from '../services/clientcare-sync-service.js';
import { createConversationStore } from '../services/conversation-store.js';

export function createClientCareBillingRoutes({ pool, requireKey, logger = console, callCouncilMember }) {
  const router = express.Router();
  const billingService = createClientCareBillingService({ pool, logger });
  const syncService = createClientCareSyncService({ billingService, logger });
  const browserService = createClientCareBrowserService({ logger, syncService });
  const opsService = createClientCareOpsService({ pool, billingService, browserService, syncService, callCouncilMember, logger });
  const conversationStore = createConversationStore(pool);

  router.use(express.json({ limit: '5mb' }));
  router.use(requireKey);

  router.get('/dashboard', async (_req, res) => {
    try {
      res.json({ ok: true, dashboard: await billingService.getDashboard() });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] dashboard failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/clientcare/readiness', async (_req, res) => {
    res.json({ ok: true, readiness: browserService.getReadiness() });
  });

  router.get('/reimbursement-intelligence', async (_req, res) => {
    try {
      const intelligence = await billingService.getReimbursementIntelligence();
      res.json({ ok: true, intelligence });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] reimbursement intelligence failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/ops/overview', async (_req, res) => {
    try {
      const overview = await opsService.buildOperationsOverview();
      res.json({ ok: true, overview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] ops overview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/ops/checklist', async (_req, res) => {
    try {
      const checklist = await opsService.getOptimizationChecklist();
      res.json({ ok: true, checklist });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] ops checklist failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/ops/capability-requests', async (req, res) => {
    try {
      const requests = await opsService.listCapabilityRequests({
        status: req.query?.status || null,
        limit: req.query?.limit,
      });
      res.json({ ok: true, requests });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] capability request list failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.patch('/ops/capability-requests/:id', async (req, res) => {
    try {
      const request = await opsService.updateCapabilityRequest(req.params.id, req.body || {});
      if (!request) return res.status(404).json({ ok: false, error: 'Capability request not found or no patch fields supplied' });
      res.json({ ok: true, request });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] capability request update failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/ops/run-workflow', async (req, res) => {
    try {
      const workflowId = String(req.body?.workflow_id || '').trim();
      if (!workflowId) return res.status(400).json({ ok: false, error: 'workflow_id required' });
      const result = await opsService.runWorkflow(workflowId, {
        requestedBy: String(req.body?.requested_by || 'overlay'),
      });
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] run workflow failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/insurance/verification-preview', async (req, res) => {
    try {
      const preview = await opsService.getInsuranceVerificationPreview(req.body || {});
      res.json({ ok: true, preview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] insurance verification preview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/patient-ar/summary', async (_req, res) => {
    try {
      const summary = await opsService.getPatientArSummary();
      res.json({ ok: true, summary });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR summary failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/login-test', async (_req, res) => {
    try {
      const result = await browserService.login({ dryRun: false });
      await result.session.close().catch(() => {});
      res.json({
        ok: true,
        page: result.page,
        screenshots: result.screenshots,
        loginSelectors: result.loginSelectors,
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser login test failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/discover', async (req, res) => {
    try {
      const result = await browserService.discoverBillingSurface({
        maxCandidates: req.body?.max_candidates,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser discover failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/inspect-page', async (req, res) => {
    try {
      const result = await browserService.inspectPage({
        href: req.body?.href,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser inspect page failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/billing-overview', async (req, res) => {
    try {
      const result = await browserService.buildBillingOverview({
        includeScreenshots: String(req.query?.include_screenshots || '').toLowerCase() === 'true',
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser billing overview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/billing-notes-transport', async (req, res) => {
    try {
      const result = await browserService.inspectBillingNotesTransport({
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] billing notes transport failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/inspect-client-account', async (req, res) => {
    try {
      const result = await browserService.inspectClientBillingAccount({
        clientHref: req.body?.client_href,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] inspect client account failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/scan-client-accounts', async (req, res) => {
    try {
      const result = await browserService.scanClientBillingAccounts({
        limit: req.body?.limit,
        offset: req.body?.offset,
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] scan client accounts failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/scan-billing-notes', async (req, res) => {
    try {
      const result = await browserService.scanBillingNotes({
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] scan billing notes failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/account-report', async (req, res) => {
    try {
      const result = await browserService.buildAccountRescueReport({
        limit: req.query?.limit,
        offset: req.query?.offset,
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] account report failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/full-account-report', async (req, res) => {
    try {
      const result = await browserService.buildFullAccountRescueReport({
        maxPages: req.query?.max_pages,
        pageTimeoutMs: req.query?.page_timeout_ms,
        accountLimit: req.query?.account_limit,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] full account report failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/backlog-summary', async (req, res) => {
    try {
      const result = await browserService.buildBacklogSummary({
        maxPages: req.query?.max_pages,
        pageTimeoutMs: req.query?.page_timeout_ms,
        accountLimit: req.query?.account_limit,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] backlog summary failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/extract-claims', async (req, res) => {
    try {
      const result = await browserService.extractClaimTables({
        importIntoQueue: Boolean(req.body?.import_into_queue),
        maxCandidates: req.body?.max_candidates,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser extract failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/assistant/session', async (_req, res) => {
    const sessionId = `clientcare-${randomUUID()}`;
    const metadata = {
      channel: 'clientcare_billing_overlay',
      created_at: new Date().toISOString(),
      archived_count: 0,
    };
    await conversationStore.save({
      sessionId,
      source: 'clientcare_overlay',
      project: 'clientcare_billing',
      messages: [],
      metadata,
      startedAt: new Date(),
    });
    res.status(201).json({ ok: true, session_id: sessionId, metadata });
  });

  router.get('/assistant/session/:sessionId', async (req, res) => {
    try {
      const conv = await conversationStore.get(req.params.sessionId);
      if (!conv) return res.status(404).json({ ok: false, error: 'Session not found' });
      const messages = Array.isArray(conv.messages) ? conv.messages : [];
      const recentWindow = 16;
      const archivedCount = Math.max(0, messages.length - recentWindow);
      const archived = messages.slice(0, archivedCount);
      const recent = messages.slice(archivedCount);
      const archive_preview = archived
        .filter((m) => m.role === 'user')
        .slice(-8)
        .map((m) => String(m.content || '').slice(0, 160))
        .join(' | ');
      res.json({
        ok: true,
        session_id: conv.session_id,
        archived_count: archivedCount,
        archive_preview,
        recent_messages: recent,
        metadata: conv.metadata || {},
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] get assistant session failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/assistant/message', async (req, res) => {
    try {
      const sessionId = String(req.body?.session_id || '').trim();
      const message = String(req.body?.message || '').trim();
      if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
      if (!message) return res.status(400).json({ ok: false, error: 'message required' });
      const existing = await conversationStore.get(sessionId);
      if (!existing) return res.status(404).json({ ok: false, error: 'Session not found' });
      const priorMessages = Array.isArray(existing.messages) ? existing.messages : [];
      const result = await opsService.ask(message, { requestedBy: 'sherry_console' });
      const parsed = {
        reply: result.reply || result.error || 'No response generated.',
        intent: result.type || 'question',
        scope: result.scope || 'unclear',
        should_apply_systemwide: Boolean(result.should_apply_systemwide),
        suggested_actions: result.suggested_actions || [],
        notes: result.notes || [],
        data: result.data || null,
      };

      const messages = [
        ...priorMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          metadata: m.metadata,
        })),
        { role: 'user', content: message, timestamp: new Date().toISOString(), metadata: { channel: 'clientcare_billing_overlay' } },
        { role: 'assistant', content: parsed.reply, timestamp: new Date().toISOString(), metadata: { intent: parsed.intent, scope: parsed.scope, should_apply_systemwide: parsed.should_apply_systemwide, suggested_actions: parsed.suggested_actions || [], notes: parsed.notes || [], data: parsed.data } },
      ];

      const archivedCount = Math.max(0, messages.length - 16);
      await conversationStore.save({
        sessionId,
        source: 'clientcare_overlay',
        project: 'clientcare_billing',
        messages,
        metadata: {
          ...(existing.metadata || {}),
          archived_count: archivedCount,
          last_intent: parsed.intent,
          last_scope: parsed.scope,
          last_should_apply_systemwide: Boolean(parsed.should_apply_systemwide),
        },
        startedAt: existing.started_at,
        endedAt: new Date(),
      });

      res.json({
        ok: true,
        session_id: sessionId,
        assistant: parsed,
        archived_count: archivedCount,
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] assistant message failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/claims/import-template', async (_req, res) => {
    res.json({ ok: true, fields: billingService.getImportTemplate() });
  });

  router.post('/snapshots/parse', async (req, res) => {
    try {
      const claims = syncService.parseSnapshot(req.body || {});
      const preview = claims.slice(0, 50);
      res.json({ ok: true, parsed: claims.length, preview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] parse snapshot failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/snapshots/import', async (req, res) => {
    try {
      const result = await syncService.importSnapshot(req.body || {});
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] import snapshot failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/reconciliation', async (req, res) => {
    try {
      const reconciliation = await syncService.buildReconciliationSummary(req.query || {});
      res.json({ ok: true, ...reconciliation });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] reconciliation failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/claims', async (req, res) => {
    try {
      const claims = await billingService.listClaims(req.query || {});
      res.json({ ok: true, claims });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] list claims failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/claims/import', async (req, res) => {
    try {
      const claims = Array.isArray(req.body?.claims) ? req.body.claims : [];
      if (!claims.length) return res.status(400).json({ ok: false, error: 'claims[] required' });
      const results = await billingService.importClaims(claims, { source: req.body?.source || 'manual_import' });
      const imported = results.filter((item) => !item.error).length;
      const failed = results.filter((item) => item.error).length;
      res.json({ ok: true, imported, failed, results });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] import failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/claims/import-csv', async (req, res) => {
    try {
      const csv = String(req.body?.csv || '');
      if (!csv.trim()) return res.status(400).json({ ok: false, error: 'csv required' });
      const claims = billingService.parseClaimsCsv(csv);
      if (!claims.length) return res.status(400).json({ ok: false, error: 'No claim rows parsed from csv' });
      const results = await billingService.importClaims(claims, { source: req.body?.source || 'csv_import' });
      const imported = results.filter((item) => !item.error).length;
      const failed = results.filter((item) => item.error).length;
      res.json({ ok: true, parsed: claims.length, imported, failed, results });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] csv import failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/claims/:claimId', async (req, res) => {
    try {
      const plan = await billingService.buildClaimPlan(req.params.claimId);
      if (!plan) return res.status(404).json({ ok: false, error: 'Claim not found' });
      res.json({ ok: true, ...plan });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] get claim failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/claims/:claimId/reclassify', async (req, res) => {
    try {
      const result = await billingService.reclassifyClaim(req.params.claimId);
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] reclassify failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/actions', async (req, res) => {
    try {
      const actions = await billingService.listActions(req.query?.claimId || null);
      res.json({ ok: true, actions });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] list actions failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.patch('/actions/:actionId', async (req, res) => {
    try {
      const action = await billingService.updateAction(req.params.actionId, req.body || {});
      if (!action) return res.status(404).json({ ok: false, error: 'Action not found or no patch fields supplied' });
      res.json({ ok: true, action });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] update action failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}
