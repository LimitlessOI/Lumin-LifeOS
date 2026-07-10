/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tcIntakeRoutes.mjs).
 */
import express from 'express';

function jsonError(res, status, message, details) {
  return res.status(status).json({ ok: false, error: message, ...(details ? { details } : {}) });
}

function getAgentId(body) {
  return body?.agentId ?? body?.agent_id ?? null;
}

function getDepsLogger(deps) {
  return deps?.logger ?? console;
}

async function callNamedService(deps, serviceName, methodName, args = []) {
  const candidate = deps?.[serviceName];
  if (candidate && typeof candidate[methodName] === 'function') {
    return candidate[methodName](...args);
  }
  return null;
}

async function safeRun(handler) {
  try {
    return await handler();
  } catch (err) {
    throw err;
  }
}

export function registerTcIntakeRoutes(app, deps) {
  const logger = getDepsLogger(deps);
  const requireKey = deps?.requireKey;
  const protectedRoute = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();

  app.post('/api/tc/intake/run', protectedRoute, async (req, res) => {
    const agentId = getAgentId(req.body);
    if (!agentId) return jsonError(res, 400, 'agentId is required');

    try {
      const result = await callNamedService(deps, 'tcIntakePipeline', 'runIntakePipeline', [req.body ?? {}, deps]);
      if (result) return res.json(result);

      return jsonError(res, 501, 'tcIntakePipeline.runIntakePipeline is not available');
    } catch (error) {
      logger.error?.({ err: error, route: '/api/tc/intake/run' }, 'tc intake pipeline failed');
      return jsonError(res, 500, 'Failed to run intake pipeline');
    }
  });

  app.post('/api/tc/intake/document-qa', protectedRoute, async (req, res) => {
    const agentId = getAgentId(req.body);
    if (!agentId) return jsonError(res, 400, 'agentId is required');

    try {
      const result = await callNamedService(deps, 'tcDocumentQA', 'runDocumentQA', [req.body ?? {}, deps]);
      if (result) return res.json(result);

      return jsonError(res, 501, 'tcDocumentQA.runDocumentQA is not available');
    } catch (error) {
      logger.error?.({ err: error, route: '/api/tc/intake/document-qa' }, 'tc document qa failed');
      return jsonError(res, 500, 'Failed to run document QA');
    }
  });

  app.post('/api/tc/offer-prep', protectedRoute, async (req, res) => {
    const agentId = getAgentId(req.body);
    if (!agentId) return jsonError(res, 400, 'agentId is required');

    try {
      const result = await callNamedService(deps, 'tcOfferPrep', 'runOfferPrep', [req.body ?? {}, deps]);
      if (result) return res.json(result);

      return jsonError(res, 501, 'tcOfferPrep.runOfferPrep is not available');
    } catch (error) {
      logger.error?.({ err: error, route: '/api/tc/offer-prep' }, 'tc offer prep failed');
      return jsonError(res, 500, 'Failed to run offer prep');
    }
  });

  app.post('/api/tc/approvals', protectedRoute, async (req, res) => {
    const agentId = getAgentId(req.body);
    if (!agentId) return jsonError(res, 400, 'agentId is required');

    try {
      const result = await callNamedService(deps, 'tcMobileApproval', 'createApprovalRequest', [req.body ?? {}, deps]);
      if (result) return res.json(result);

      return jsonError(res, 501, 'tcMobileApproval.createApprovalRequest is not available');
    } catch (error) {
      logger.error?.({ err: error, route: '/api/tc/approvals', body: req.body }, 'tc approval creation failed');
      return jsonError(res, 500, 'Failed to create approval request');
    }
  });

  app.patch('/api/tc/approvals/:id', protectedRoute, async (req, res) => {
    const agentId = getAgentId(req.body);
    if (!agentId) return jsonError(res, 400, 'agentId is required');

    try {
      const result = await callNamedService(deps, 'tcMobileApproval', 'processApproval', [
        { ...req.body, id: req.params?.id },
        deps,
      ]);
      if (result) return res.json(result);

      return jsonError(res, 501, 'tcMobileApproval.processApproval is not available');
    } catch (error) {
      logger.error?.({ err: error, route: '/api/tc/approvals/:id', approvalId: req.params?.id }, 'tc approval processing failed');
      return jsonError(res, 500, 'Failed to process approval');
    }
  });

  app.post('/api/tc/showing-feedback', protectedRoute, async (req, res) => {
    const agentId = getAgentId(req.body);
    if (!agentId) return jsonError(res, 400, 'agentId is required');

    try {
      const result = await callNamedService(deps, 'tcShowingFeedback', 'sendShowingFeedbackRequest', [req.body ?? {}, deps]);
      if (result) return res.json(result);

      return jsonError(res, 501, 'tcShowingFeedback.sendShowingFeedbackRequest is not available');
    } catch (error) {
      logger.error?.({ err: error, route: '/api/tc/showing-feedback' }, 'tc showing feedback request failed');
      return jsonError(res, 500, 'Failed to send showing feedback request');
    }
  });

  app.post('/api/tc/showing-feedback/webhook', async (req, res) => {
    const agentId = getAgentId(req.body);
    if (!agentId) return jsonError(res, 400, 'agentId is required');

    try {
      const result = await callNamedService(deps, 'tcShowingFeedback', 'recordFeedbackWebhook', [req.body ?? {}, deps]);
      if (result) return res.json(result);

      return jsonError(res, 501, 'tcShowingFeedback.recordFeedbackWebhook is not available');
    } catch (error) {
      logger.error?.({ err: error, route: '/api/tc/showing-feedback/webhook' }, 'tc showing feedback webhook failed');
      return jsonError(res, 500, 'Failed to record showing feedback webhook');
    }
  });
}

export default registerTcIntakeRoutes;