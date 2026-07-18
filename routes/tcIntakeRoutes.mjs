/**
 * SYNOPSIS: TC intake / document-QA / offer-prep / approvals / showing-feedback routes.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import { runIntakePipeline } from '../services/tcIntakePipeline.mjs';
import { runDocumentQA } from '../services/tcDocumentQA.mjs';
import { runOfferPrep } from '../services/tcOfferPrep.mjs';
import { createApprovalRequest, processApproval } from '../services/tcMobileApproval.mjs';
import {
  sendShowingFeedbackRequest,
  recordFeedbackWebhook,
} from '../services/tcShowingFeedback.mjs';

function getAuth(deps) {
  return deps?.requireAuth || deps?.requireKey || null;
}

function getAgentId(req) {
  return (
    req?.body?.agentId ??
    req?.body?.agent_id ??
    req?.query?.agentId ??
    req?.query?.agent_id ??
    req?.params?.agentId ??
    null
  );
}

export function registerTcIntakeRoutes(app, deps = {}) {
  if (!app || typeof app.post !== 'function' || typeof app.patch !== 'function') {
    throw new Error('registerTcIntakeRoutes requires an Express app');
  }

  const requireAuth = getAuth(deps);
  if (typeof requireAuth !== 'function') {
    throw new Error('registerTcIntakeRoutes requires deps.requireAuth or deps.requireKey');
  }

  app.post('/api/tc/intake/run', requireAuth, async (req, res) => {
    try {
      const agentId = getAgentId(req);
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const result = await runIntakePipeline({ ...deps, agentId, body: req.body });
      return res.status(200).json({ ok: true, ...(result && typeof result === 'object' ? result : { result }) });
    } catch (err) {
      deps.logger?.error?.({ err }, 'tc intake run failed');
      return res.status(500).json({ error: err?.message || 'tc_intake_run_failed' });
    }
  });

  app.post('/api/tc/intake/document-qa', requireAuth, async (req, res) => {
    try {
      const agentId = getAgentId(req);
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const transactionId = req.body?.transactionId ?? req.body?.transaction_id;
      const documentBuffer = req.body?.documentBuffer ?? req.body?.document_buffer ?? req.body?.document;
      const result = await runDocumentQA(deps, { transactionId, documentBuffer });
      return res.status(200).json({ ok: true, agentId, ...result });
    } catch (err) {
      deps.logger?.error?.({ err }, 'tc document qa failed');
      return res.status(500).json({ error: err?.message || 'tc_document_qa_failed' });
    }
  });

  app.post('/api/tc/offer-prep', requireAuth, async (req, res) => {
    try {
      const agentId = getAgentId(req);
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const propertyAddress = req.body?.propertyAddress ?? req.body?.property_address;
      const clientProfileId = req.body?.clientProfileId ?? req.body?.client_profile_id;
      const result = await runOfferPrep(deps, { agentId, propertyAddress, clientProfileId });
      return res.status(200).json({ ok: true, ...(result && typeof result === 'object' ? result : { result }) });
    } catch (err) {
      deps.logger?.error?.({ err }, 'tc offer prep failed');
      return res.status(500).json({ error: err?.message || 'tc_offer_prep_failed' });
    }
  });

  app.post('/api/tc/approvals', requireAuth, async (req, res) => {
    try {
      const agentId = getAgentId(req);
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const transactionId = req.body?.transactionId ?? req.body?.transaction_id;
      const documentUrl = req.body?.documentUrl ?? req.body?.document_url;
      const action = req.body?.action;
      const result = await createApprovalRequest(deps, { transactionId, agentId, documentUrl, action });
      return res.status(200).json({ ok: true, ...(result && typeof result === 'object' ? result : { result }) });
    } catch (err) {
      deps.logger?.error?.({ err }, 'tc approval create failed');
      return res.status(500).json({ error: err?.message || 'tc_approval_create_failed' });
    }
  });

  app.patch('/api/tc/approvals/:id', requireAuth, async (req, res) => {
    try {
      const agentId = getAgentId(req);
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const approvalId = req.params?.id;
      const decision = req.body?.decision;
      const signatureToken = req.body?.signatureToken ?? req.body?.signature_token;
      const result = await processApproval(deps, { approvalId, decision, signatureToken });
      return res.status(200).json({ ok: true, agentId, ...(result && typeof result === 'object' ? result : { result }) });
    } catch (err) {
      deps.logger?.error?.({ err }, 'tc approval process failed');
      return res.status(500).json({ error: err?.message || 'tc_approval_process_failed' });
    }
  });

  app.post('/api/tc/showing-feedback', requireAuth, async (req, res) => {
    try {
      const agentId = getAgentId(req);
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const transactionId = req.body?.transactionId ?? req.body?.transaction_id;
      const agentEmail = req.body?.agentEmail ?? req.body?.agent_email;
      const showingDate = req.body?.showingDate ?? req.body?.showing_date;
      const result = await sendShowingFeedbackRequest(deps, { transactionId, agentEmail, showingDate });
      return res.status(200).json({ ok: true, agentId, ...(result && typeof result === 'object' ? result : { result }) });
    } catch (err) {
      deps.logger?.error?.({ err }, 'tc showing feedback request failed');
      return res.status(500).json({ error: err?.message || 'tc_showing_feedback_failed' });
    }
  });

  app.post('/api/tc/showing-feedback/webhook', async (req, res) => {
    try {
      const requestId = req.body?.requestId ?? req.body?.request_id;
      const feedbackPayload = req.body?.feedbackPayload ?? req.body?.feedback_payload ?? req.body;
      const result = await recordFeedbackWebhook(deps, { requestId, feedbackPayload });
      return res.status(200).json({ ok: true, ...(result && typeof result === 'object' ? result : { result }) });
    } catch (err) {
      deps.logger?.error?.({ err }, 'tc showing feedback webhook failed');
      return res.status(500).json({ error: err?.message || 'tc_showing_feedback_webhook_failed' });
    }
  });
}

export default registerTcIntakeRoutes;
