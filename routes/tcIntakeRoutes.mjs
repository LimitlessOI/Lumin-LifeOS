/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tcIntakeRoutes.mjs).
 */
import * as tcIntakePipeline from './services/tcIntakePipeline.mjs';
import * as tcDocumentQA from './services/tcDocumentQA.mjs';
import * as tcOfferPrep from './services/tcOfferPrep.mjs';
import * as tcMobileApproval from './services/tcMobileApproval.mjs';
import * as tcShowingFeedback from './services/tcShowingFeedback.mjs';

function sendJson(res, statusCode, body) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(body);
  }
  return res.json(body);
}

function getAgentId(req) {
  return (
    req?.body?.agentId ??
    req?.body?.agent_id ??
    req?.query?.agentId ??
    req?.query?.agent_id ??
    req?.params?.agentId ??
    req?.params?.agent_id ??
    null
  );
}

function requireAgentId(req, res) {
  const agentId = getAgentId(req);
  if (!agentId) {
    sendJson(res, 400, { ok: false, error: 'agentId is required' });
    return null;
  }
  return agentId;
}

function wrapHandler(fn, deps) {
  return async (req, res) => {
    try {
      const result = await fn(req, res, deps);
      if (result === undefined || res.headersSent) return;
      if (typeof result === 'object' && result !== null && 'status' in result && 'body' in result) {
        return sendJson(res, result.status, result.body);
      }
      return sendJson(res, 200, { ok: true, data: result });
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'tc intake route failed');
      return sendJson(res, 500, { ok: false, error: error?.message || 'Internal server error' });
    }
  };
}

export function registerTcIntakeRoutes(app, deps = {}) {
  if (!app || typeof app.post !== 'function' || typeof app.patch !== 'function') {
    throw new Error('registerTcIntakeRoutes requires an Express app');
  }

  app.post(
    '/api/tc/intake/run',
    deps.requireKey,
    wrapHandler(async (req, res, innerDeps) => {
      const agentId = requireAgentId(req, res);
      if (!agentId) return;
      if (typeof tcIntakePipeline.runIntakePipeline !== 'function') {
        return { status: 500, body: { ok: false, error: 'tcIntakePipeline.runIntakePipeline is unavailable' } };
      }
      return await tcIntakePipeline.runIntakePipeline(req, res, { ...innerDeps, agentId });
    }, deps)
  );

  app.post(
    '/api/tc/intake/document-qa',
    deps.requireKey,
    wrapHandler(async (req, res, innerDeps) => {
      const agentId = requireAgentId(req, res);
      if (!agentId) return;
      if (typeof tcDocumentQA.runDocumentQA !== 'function') {
        return { status: 500, body: { ok: false, error: 'tcDocumentQA.runDocumentQA is unavailable' } };
      }
      return await tcDocumentQA.runDocumentQA(req, res, { ...innerDeps, agentId });
    }, deps)
  );

  app.post(
    '/api/tc/offer-prep',
    deps.requireKey,
    wrapHandler(async (req, res, innerDeps) => {
      const agentId = requireAgentId(req, res);
      if (!agentId) return;
      if (typeof tcOfferPrep.runOfferPrep !== 'function') {
        return { status: 500, body: { ok: false, error: 'tcOfferPrep.runOfferPrep is unavailable' } };
      }
      return await tcOfferPrep.runOfferPrep(req, res, { ...innerDeps, agentId });
    }, deps)
  );

  app.post(
    '/api/tc/approvals',
    deps.requireKey,
    wrapHandler(async (req, res, innerDeps) => {
      const agentId = requireAgentId(req, res);
      if (!agentId) return;
      if (typeof tcMobileApproval.createApprovalRequest !== 'function') {
        return { status: 500, body: { ok: false, error: 'tcMobileApproval.createApprovalRequest is unavailable' } };
      }
      return await tcMobileApproval.createApprovalRequest(req, res, { ...innerDeps, agentId });
    }, deps)
  );

  app.patch(
    '/api/tc/approvals/:id',
    deps.requireKey,
    wrapHandler(async (req, res, innerDeps) => {
      const agentId = requireAgentId(req, res);
      if (!agentId) return;
      if (typeof tcMobileApproval.processApproval !== 'function') {
        return { status: 500, body: { ok: false, error: 'tcMobileApproval.processApproval is unavailable' } };
      }
      return await tcMobileApproval.processApproval(req, res, { ...innerDeps, agentId });
    }, deps)
  );

  app.post(
    '/api/tc/showing-feedback',
    deps.requireKey,
    wrapHandler(async (req, res, innerDeps) => {
      const agentId = requireAgentId(req, res);
      if (!agentId) return;
      if (typeof tcShowingFeedback.sendShowingFeedbackRequest !== 'function') {
        return { status: 500, body: { ok: false, error: 'tcShowingFeedback.sendShowingFeedbackRequest is unavailable' } };
      }
      return await tcShowingFeedback.sendShowingFeedbackRequest(req, res, { ...innerDeps, agentId });
    }, deps)
  );

  app.post(
    '/api/tc/showing-feedback/webhook',
    wrapHandler(async (req, res, innerDeps) => {
      if (typeof tcShowingFeedback.recordFeedbackWebhook !== 'function') {
        return { status: 500, body: { ok: false, error: 'tcShowingFeedback.recordFeedbackWebhook is unavailable' } };
      }
      return await tcShowingFeedback.recordFeedbackWebhook(req, res, { ...innerDeps, agentId: getAgentId(req) });
    }, deps)
  );
}

export default registerTcIntakeRoutes;