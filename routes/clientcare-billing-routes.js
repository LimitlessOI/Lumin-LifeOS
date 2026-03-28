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
import { createClientCareSellableService } from '../services/clientcare-sellable-service.js';
import { createClientCareSyncService } from '../services/clientcare-sync-service.js';
import { createConversationStore } from '../services/conversation-store.js';

export function createClientCareBillingRoutes({ pool, requireKey, logger = console, callCouncilMember }) {
  const router = express.Router();
  const billingService = createClientCareBillingService({ pool, logger });
  const syncService = createClientCareSyncService({ billingService, logger });
  const browserService = createClientCareBrowserService({ logger, syncService });
  const opsService = createClientCareOpsService({ pool, billingService, browserService, syncService, callCouncilMember, logger });
  const sellableService = createClientCareSellableService({ pool, logger });
  const conversationStore = createConversationStore(pool);

  function getTenantId(req) {
    return req.headers['x-clientcare-tenant-id'] || req.body?.tenant_id || req.query?.tenant_id || null;
  }

  function getOperatorEmail(req) {
    return req.headers['x-operator-email'] || req.body?.operator_email || req.body?.updated_by || req.body?.requested_by || req.body?.owner || null;
  }

  async function enforceOperatorAccess(req, roles = []) {
    const tenantId = getTenantId(req);
    const operatorEmail = getOperatorEmail(req);
    return sellableService.assertOperatorAccess({ tenantId, operatorEmail, roles });
  }

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

  router.get('/payer-playbooks', async (req, res) => {
    try {
      const playbooks = await billingService.getPayerPlaybooks({ limit: req.query?.limit });
      res.json({ ok: true, ...playbooks });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] payer playbooks failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/payer-rules', async (_req, res) => {
    try {
      const rules = await billingService.listPayerRuleOverrides();
      res.json({ ok: true, rules });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] payer rules failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/payer-rules', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const rule = await billingService.savePayerRuleOverride(req.body || {});
      await sellableService.logAudit({
        actor: String(req.body?.updated_by || 'overlay'),
        actionType: 'payer_rule_save',
        entityType: 'payer_rule',
        entityId: String(rule.payer_name || ''),
        details: rule,
      });
      res.json({ ok: true, rule });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] save payer rule failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/era-insights', async (req, res) => {
    try {
      const insights = await billingService.getEraInsights({ limit: req.query?.limit });
      res.json({ ok: true, ...insights });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] era insights failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/underpayments', async (req, res) => {
    try {
      const underpayments = await billingService.getUnderpaymentQueue({ limit: req.query?.limit });
      res.json({ ok: true, ...underpayments });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] underpayment queue failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/appeals/queue', async (req, res) => {
    try {
      const appeals = await billingService.getAppealsQueue({ limit: req.query?.limit });
      res.json({ ok: true, ...appeals });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] appeals queue failed');
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

  router.get('/packaging/overview', async (req, res) => {
    try {
      const overview = await sellableService.getPackagingOverview({
        tenantId: req.query?.tenant_id || null,
        auditLimit: req.query?.audit_limit || 20,
      });
      res.json({ ok: true, overview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] packaging overview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/packaging/readiness-report', async (req, res) => {
    try {
      const report = await sellableService.getReadinessReport({
        tenantId: req.query?.tenant_id || null,
      });
      res.json({ ok: true, report });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] readiness report failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/packaging/validate', async (req, res) => {
    try {
      const tenantId = req.body?.tenant_id || req.query?.tenant_id || null;
      const report = await sellableService.buildLiveValidation({
        tenantId,
        browserReadiness: browserService.getReadiness(),
        dashboard: await billingService.getDashboard(),
        reimbursement: await billingService.getReimbursementIntelligence(),
      });
      await sellableService.logAudit({
        tenantId: tenantId || report.tenant?.id || null,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'packaging_validate',
        entityType: 'tenant',
        entityId: String(report.tenant?.id || report.tenant?.slug || ''),
        details: report.summary,
      });
      res.json({ ok: true, report });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] packaging validation failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/tenants', async (_req, res) => {
    try {
      const tenants = await sellableService.listTenants();
      res.json({ ok: true, tenants });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] list tenants failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tenants', async (req, res) => {
    try {
      if (req.body?.id || req.body?.tenant_id) await enforceOperatorAccess(req, ['manager']);
      const tenant = await sellableService.saveTenant(req.body || {});
      await sellableService.logAudit({
        tenantId: tenant.id || null,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'tenant_save',
        entityType: 'tenant',
        entityId: String(tenant.id || tenant.slug || ''),
        details: tenant,
      });
      res.json({ ok: true, tenant });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] save tenant failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/tenants/:tenantId/onboarding', async (req, res) => {
    try {
      const onboarding = await sellableService.getOnboarding(req.params.tenantId);
      res.json({ ok: true, onboarding });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] onboarding fetch failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tenants/:tenantId/onboarding', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['manager']);
      const onboarding = await sellableService.saveOnboarding(req.params.tenantId, req.body || {});
      await sellableService.logAudit({
        tenantId: req.params.tenantId,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'onboarding_save',
        entityType: 'onboarding',
        entityId: String(req.params.tenantId),
        details: onboarding,
      });
      res.json({ ok: true, onboarding });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] onboarding save failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/tenants/:tenantId/operators', async (req, res) => {
    try {
      const operators = await sellableService.listOperatorAccess(req.params.tenantId);
      res.json({ ok: true, operators });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] operator list failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tenants/:tenantId/operators', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['manager']);
      const operator = await sellableService.saveOperatorAccess(req.params.tenantId, req.body || {});
      await sellableService.logAudit({
        tenantId: req.params.tenantId,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'operator_access_save',
        entityType: 'operator_access',
        entityId: String(operator.id || operator.operator_email || ''),
        details: operator,
      });
      res.json({ ok: true, operator });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] operator save failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/audit-log', async (req, res) => {
    try {
      const audit = await sellableService.listAuditLog({
        tenantId: req.query?.tenant_id || null,
        limit: req.query?.limit || 50,
      });
      res.json({ ok: true, audit });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] audit log failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/audit-log/export', async (req, res) => {
    try {
      const audit = await sellableService.listAuditLog({
        tenantId: req.query?.tenant_id || null,
        limit: req.query?.limit || 200,
      });
      const csv = sellableService.exportAuditLogCsv(audit);
      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', 'attachment; filename="clientcare-audit-log.csv"');
      res.status(200).send(csv);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] audit export failed');
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
      await enforceOperatorAccess(req, ['operator', 'manager']);
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

  router.post('/ops/repair-account', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const billingHref = String(req.body?.billing_href || '').trim();
      if (!billingHref) return res.status(400).json({ ok: false, error: 'billing_href required' });
      const result = await opsService.repairAccount({
        billingHref,
        account: req.body?.account || null,
        updates: req.body?.updates || {},
        dryRun: req.body?.dry_run !== false,
        requestedBy: String(req.body?.requested_by || 'overlay'),
      });
      if (!result.ok) return res.status(500).json(result);
      await sellableService.logAudit({
        actor: String(req.body?.requested_by || 'overlay'),
        actionType: result.dryRun ? 'repair_preview' : 'repair_apply',
        entityType: 'billing_account',
        entityId: String(billingHref),
        details: { updates: req.body?.updates || {}, dry_run: req.body?.dry_run !== false },
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] repair account failed');
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

  router.get('/patient-ar/policy', async (_req, res) => {
    try {
      const policy = await opsService.getPatientArPolicy();
      res.json({ ok: true, policy });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR policy failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/patient-ar/policy', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['manager']);
      const policy = await opsService.savePatientArPolicy(req.body || {}, {
        updatedBy: String(req.body?.updated_by || 'overlay'),
      });
      await sellableService.logAudit({
        actor: String(req.body?.updated_by || 'overlay'),
        actionType: 'patient_ar_policy_save',
        entityType: 'patient_ar_policy',
        entityId: 'default',
        details: policy,
      });
      res.json({ ok: true, policy });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] save patient AR policy failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/patient-ar/escalation-queue', async (req, res) => {
    try {
      const queue = await opsService.getPatientArEscalationQueue({ limit: req.query?.limit });
      res.json({ ok: true, ...queue });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR escalation queue failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/patient-ar/:claimId/queue-action', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await opsService.queuePatientArAction(req.params.claimId, {
        owner: req.body?.owner || 'overlay',
        actionType: req.body?.action_type || 'patient_ar_followup',
      });
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      await sellableService.logAudit({
        actor: String(req.body?.owner || 'overlay'),
        actionType: req.body?.action_type || 'patient_ar_followup',
        entityType: 'claim_action',
        entityId: String(result.action?.id || req.params.claimId),
        details: result,
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR queue action failed');
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

  router.post('/history/import-csv', async (req, res) => {
    try {
      const csv = String(req.body?.csv || '');
      if (!csv.trim()) return res.status(400).json({ ok: false, error: 'csv required' });
      const result = await billingService.importPaymentHistoryCsv(csv, { source: req.body?.source || 'payment_history_csv' });
      if (!result.parsed) return res.status(400).json({ ok: false, error: 'No payment-history rows parsed from csv' });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] payment history csv import failed');
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

  router.get('/appeals/:claimId/packet', async (req, res) => {
    try {
      const packet = await billingService.buildAppealPacketPreview(req.params.claimId);
      if (!packet) return res.status(404).json({ ok: false, error: 'Claim not found' });
      res.json({ ok: true, ...packet });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] appeal packet failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/appeals/:claimId/queue-action', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await billingService.queueAppealAction(req.params.claimId, {
        owner: req.body?.owner || null,
        actionType: req.body?.action_type || 'appeal_followup',
      });
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      await sellableService.logAudit({
        actor: String(req.body?.owner || 'overlay'),
        actionType: req.body?.action_type || 'appeal_followup',
        entityType: 'claim_action',
        entityId: String(result.action?.id || req.params.claimId),
        details: result,
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] queue appeal action failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/underpayments/:claimId/queue-action', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await billingService.queueUnderpaymentAction(req.params.claimId, {
        owner: req.body?.owner || null,
        actionType: req.body?.action_type || 'underpayment_review',
      });
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      await sellableService.logAudit({
        actor: String(req.body?.owner || 'overlay'),
        actionType: req.body?.action_type || 'underpayment_review',
        entityType: 'claim_action',
        entityId: String(result.action?.id || req.params.claimId),
        details: result,
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] queue underpayment action failed');
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
