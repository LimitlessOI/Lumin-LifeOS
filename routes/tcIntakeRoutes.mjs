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
    null
  );
}

function requireAgentId(req, res) {
  const agentId = getAgentId(req);
  if (!agentId) {
    res.status(400).json({ ok: false, error: 'agentId is required' });
    return null;
  }
  return agentId;
}

async function runHandler(res, fn) {
  try {
    const result = await fn();
    if (result && !res.headersSent) {
      res.json(result);
      return;
    }
    if (!res.headersSent) {
      res.json({ ok: true });
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        error: error?.message || 'Internal server error',
      });
    }
  }
}

export function registerTcIntakeRoutes(app, deps) {
  app.post('/api/tc/intake/run', deps.requireKey, async (req, res) => {
    const agentId = requireAgentId(req, res);
    if (!agentId) return;
    await runHandler(res, () => tcIntakePipeline.runIntakePipeline(req, deps, { agentId }));
  });

  app.post('/api/tc/intake/document-qa', deps.requireKey, async (req, res) => {
    const agentId = requireAgentId(req, res);
    if (!agentId) return;
    await runHandler(res, () => tcDocumentQA.runDocumentQA(req, deps, { agentId }));
  });

  app.post('/api/tc/offer-prep', deps.requireKey, async (req, res) => {
    const agentId = requireAgentId(req, res);
    if (!agentId) return;
    await runHandler(res, () => tcOfferPrep.runOfferPrep(req, deps, { agentId }));
  });

  app.post('/api/tc/approvals', deps.requireKey, async (req, res) => {
    const agentId = requireAgentId(req, res);
    if (!agentId) return;
    await runHandler(res, () => tcMobileApproval.createApprovalRequest(req, deps, { agentId }));
  });

  app.patch('/api/tc/approvals/:id', deps.requireKey, async (req, res) => {
    const agentId = requireAgentId(req, res);
    if (!agentId) return;
    await runHandler(res, () => tcMobileApproval.processApproval(req, deps, { agentId }));
  });

  app.post('/api/tc/showing-feedback', deps.requireKey, async (req, res) => {
    const agentId = requireAgentId(req, res);
    if (!agentId) return;
    await runHandler(res, () => tcShowingFeedback.sendShowingFeedbackRequest(req, deps, { agentId }));
  });

  app.post('/api/tc/showing-feedback/webhook', async (req, res) => {
    await runHandler(res, () => tcShowingFeedback.recordFeedbackWebhook(req, deps));
  });
}

export default registerTcIntakeRoutes;