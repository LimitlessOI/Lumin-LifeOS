/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tcIntakeRoutes.mjs).
 */
import { tcIntakePipeline } from '../services/tcIntakePipeline.js';
import { tcDocumentQA } from '../services/tcDocumentQA.js';
import { tcOfferPrep } from '../services/tcOfferPrep.js';
import { tcMobileApproval } from '../services/tcMobileApproval.js';
import { tcShowingFeedback } from '../services/tcShowingFeedback.js';

function getAgentId(req) {
  return req.body?.agentId ?? req.query?.agentId ?? req.params?.agentId ?? null;
}

function jsonError(res, status, message, details) {
  const payload = { ok: false, error: message };
  if (details !== undefined) payload.details = details;
  return res.status(status).json(payload);
}

function withHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      req.app?.get?.('logger')?.error?.({ err }, 'tc intake route failed');
      return jsonError(res, 500, 'Internal server error');
    }
  };
}

export function registerTcIntakeRoutes(app, deps) {
  const requireKey = deps?.requireKey;
  const logger = deps?.logger;
  const db = deps?.pool;
  const baseUrl = deps?.baseUrl;

  if (logger) {
    app.set?.('logger', logger);
  }

  app.post(
    '/api/tc/intake/run',
    requireKey,
    withHandler(async (req, res) => {
      const agentId = getAgentId(req);
      if (!agentId) return jsonError(res, 400, 'agentId is required');
      const result = await tcIntakePipeline.runIntakePipeline({ req, res, deps: { ...deps, db, baseUrl }, agentId });
      return res.json(result ?? { ok: true });
    })
  );

  app.post(
    '/api/tc/intake/document-qa',
    requireKey,
    withHandler(async (req, res) => {
      const agentId = getAgentId(req);
      if (!agentId) return jsonError(res, 400, 'agentId is required');
      const result = await tcDocumentQA.runDocumentQA({ req, res, deps: { ...deps, db, baseUrl }, agentId });
      return res.json(result ?? { ok: true });
    })
  );

  app.post(
    '/api/tc/offer-prep',
    requireKey,
    withHandler(async (req, res) => {
      const agentId = getAgentId(req);
      if (!agentId) return jsonError(res, 400, 'agentId is required');
      const result = await tcOfferPrep.runOfferPrep({ req, res, deps: { ...deps, db, baseUrl }, agentId });
      return res.json(result ?? { ok: true });
    })
  );

  app.post(
    '/api/tc/approvals',
    requireKey,
    withHandler(async (req, res) => {
      const agentId = getAgentId(req);
      if (!agentId) return jsonError(res, 400, 'agentId is required');
      const result = await tcMobileApproval.createApprovalRequest({ req, res, deps: { ...deps, db, baseUrl }, agentId });
      return res.json(result ?? { ok: true });
    })
  );

  app.patch(
    '/api/tc/approvals/:id',
    requireKey,
    withHandler(async (req, res) => {
      const agentId = getAgentId(req);
      if (!agentId) return jsonError(res, 400, 'agentId is required');
      const result = await tcMobileApproval.processApproval({ req, res, deps: { ...deps, db, baseUrl }, agentId });
      return res.json(result ?? { ok: true });
    })
  );

  app.post(
    '/api/tc/showing-feedback',
    requireKey,
    withHandler(async (req, res) => {
      const agentId = getAgentId(req);
      if (!agentId) return jsonError(res, 400, 'agentId is required');
      const result = await tcShowingFeedback.sendShowingFeedbackRequest({ req, res, deps: { ...deps, db, baseUrl }, agentId });
      return res.json(result ?? { ok: true });
    })
  );

  app.post(
    '/api/tc/showing-feedback/webhook',
    withHandler(async (req, res) => {
      const result = await tcShowingFeedback.recordFeedbackWebhook({ req, res, deps: { ...deps, db, baseUrl } });
      return res.json(result ?? { ok: true });
    })
  );
}

export default registerTcIntakeRoutes;