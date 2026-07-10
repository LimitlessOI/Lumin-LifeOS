/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tcIntakeRoutes.mjs).
 */
import { tcIntakePipeline } from '../services/tcIntakePipeline.mjs';
import { tcDocumentQA } from '../services/tcDocumentQA.mjs';
import { tcOfferPrep } from '../services/tcOfferPrep.mjs';
import { tcMobileApproval } from '../services/tcMobileApproval.mjs';
import { tcShowingFeedback } from '../services/tcShowingFeedback.mjs';

function getAgentId(req) {
  return (
    req.body?.agentId ??
    req.body?.agent_id ??
    req.query?.agentId ??
    req.query?.agent_id ??
    req.params?.agentId ??
    req.params?.agent_id ??
    null
  );
}

function ensureAgentId(req, res) {
  const agentId = getAgentId(req);
  if (!agentId) {
    res.status(400).json({ ok: false, error: 'agentId is required' });
    return null;
  }
  return agentId;
}

async function runHandler(fn, req, res, deps) {
  try {
    const agentId = ensureAgentId(req, res);
    if (!agentId) return;

    const result = await fn(req, deps, agentId);
    res.json(result ?? { ok: true });
  } catch (error) {
    deps?.logger?.error?.({ err: error }, 'tc intake route failed');
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}

export function registerTcIntakeRoutes(app, deps) {
  app.post('/api/tc/intake/run', async (req, res) => {
    await runHandler(async (request, injectedDeps, agentId) => {
      return tcIntakePipeline.runIntakePipeline(request, injectedDeps, agentId);
    }, req, res, deps);
  });

  app.post('/api/tc/intake/document-qa', async (req, res) => {
    await runHandler(async (request, injectedDeps, agentId) => {
      return tcDocumentQA.runDocumentQA(request, injectedDeps, agentId);
    }, req, res, deps);
  });

  app.post('/api/tc/offer-prep', async (req, res) => {
    await runHandler(async (request, injectedDeps, agentId) => {
      return tcOfferPrep.runOfferPrep(request, injectedDeps, agentId);
    }, req, res, deps);
  });

  app.post('/api/tc/approvals', deps.requireKey, async (req, res) => {
    await runHandler(async (request, injectedDeps, agentId) => {
      return tcMobileApproval.createApprovalRequest(request, injectedDeps, agentId);
    }, req, res, deps);
  });

  app.patch('/api/tc/approvals/:id', deps.requireKey, async (req, res) => {
    await runHandler(async (request, injectedDeps, agentId) => {
      return tcMobileApproval.processApproval(request, injectedDeps, agentId);
    }, req, res, deps);
  });

  app.post('/api/tc/showing-feedback', async (req, res) => {
    await runHandler(async (request, injectedDeps, agentId) => {
      return tcShowingFeedback.sendShowingFeedbackRequest(request, injectedDeps, agentId);
    }, req, res, deps);
  });

  app.post('/api/tc/showing-feedback/webhook', async (req, res) => {
    await runHandler(async (request, injectedDeps, agentId) => {
      return tcShowingFeedback.recordFeedbackWebhook(request, injectedDeps, agentId);
    }, req, res, deps);
  });
}

export default registerTcIntakeRoutes;