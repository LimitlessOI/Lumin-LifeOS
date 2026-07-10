/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tcIntakeRoutes.mjs).
 */
import tcIntakePipeline from '../services/tcIntakePipeline.mjs';
import tcDocumentQA from '../services/tcDocumentQA.mjs';
import tcOfferPrep from '../services/tcOfferPrep.mjs';
import tcMobileApproval from '../services/tcMobileApproval.mjs';
import tcShowingFeedback from '../services/tcShowingFeedback.mjs';

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

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

function normalizeError(err) {
  return {
    error: err?.message || 'Unexpected error',
  };
}

function attachRoute(app, method, path, middlewareOrHandler, handlerMaybe) {
  if (handlerMaybe) {
    app[method](path, middlewareOrHandler, handlerMaybe);
    return;
  }
  app[method](path, middlewareOrHandler);
}

export function registerTcIntakeRoutes(app, deps) {
  if (!app || !deps) {
    throw new Error('registerTcIntakeRoutes requires app and deps');
  }

  attachRoute(
    app,
    'post',
    '/api/tc/intake/run',
    deps.requireKey,
    async (req, res) => {
      try {
        const agentId = getAgentId(req);
        if (!agentId) {
          return sendJson(res, 400, { error: 'agentId is required' });
        }

        const result = await tcIntakePipeline.runIntakePipeline({
          req,
          deps,
          agentId,
        });

        return sendJson(res, 200, {
          ok: true,
          ...((result && typeof result === 'object') ? result : { result }),
        });
      } catch (err) {
        deps.logger?.error?.({ err }, 'tc intake run failed');
        return sendJson(res, 500, normalizeError(err));
      }
    }
  );

  attachRoute(
    app,
    'post',
    '/api/tc/intake/document-qa',
    deps.requireKey,
    async (req, res) => {
      try {
        const agentId = getAgentId(req);
        if (!agentId) {
          return sendJson(res, 400, { error: 'agentId is required' });
        }

        const result = await tcDocumentQA.runDocumentQA({
          req,
          deps,
          agentId,
        });

        return sendJson(res, 200, {
          ok: true,
          ...((result && typeof result === 'object') ? result : { result }),
        });
      } catch (err) {
        deps.logger?.error?.({ err }, 'tc document qa failed');
        return sendJson(res, 500, normalizeError(err));
      }
    }
  );

  attachRoute(
    app,
    'post',
    '/api/tc/offer-prep',
    deps.requireKey,
    async (req, res) => {
      try {
        const agentId = getAgentId(req);
        if (!agentId) {
          return sendJson(res, 400, { error: 'agentId is required' });
        }

        const result = await tcOfferPrep.runOfferPrep({
          req,
          deps,
          agentId,
        });

        return sendJson(res, 200, {
          ok: true,
          ...((result && typeof result === 'object') ? result : { result }),
        });
      } catch (err) {
        deps.logger?.error?.({ err }, 'tc offer prep failed');
        return sendJson(res, 500, normalizeError(err));
      }
    }
  );

  attachRoute(
    app,
    'post',
    '/api/tc/approvals',
    deps.requireKey,
    async (req, res) => {
      try {
        const agentId = getAgentId(req);
        if (!agentId) {
          return sendJson(res, 400, { error: 'agentId is required' });
        }

        const result = await tcMobileApproval.createApprovalRequest({
          req,
          deps,
          agentId,
        });

        return sendJson(res, 200, {
          ok: true,
          ...((result && typeof result === 'object') ? result : { result }),
        });
      } catch (err) {
        deps.logger?.error?.({ err }, 'tc approval create failed');
        return sendJson(res, 500, normalizeError(err));
      }
    }
  );

  attachRoute(
    app,
    'patch',
    '/api/tc/approvals/:id',
    deps.requireKey,
    async (req, res) => {
      try {
        const agentId = getAgentId(req);
        if (!agentId) {
          return sendJson(res, 400, { error: 'agentId is required' });
        }

        const result = await tcMobileApproval.processApproval({
          req,
          deps,
          agentId,
        });

        return sendJson(res, 200, {
          ok: true,
          ...((result && typeof result === 'object') ? result : { result }),
        });
      } catch (err) {
        deps.logger?.error?.({ err }, 'tc approval process failed');
        return sendJson(res, 500, normalizeError(err));
      }
    }
  );

  attachRoute(
    app,
    'post',
    '/api/tc/showing-feedback',
    deps.requireKey,
    async (req, res) => {
      try {
        const agentId = getAgentId(req);
        if (!agentId) {
          return sendJson(res, 400, { error: 'agentId is required' });
        }

        const result = await tcShowingFeedback.sendShowingFeedbackRequest({
          req,
          deps,
          agentId,
        });

        return sendJson(res, 200, {
          ok: true,
          ...((result && typeof result === 'object') ? result : { result }),
        });
      } catch (err) {
        deps.logger?.error?.({ err }, 'tc showing feedback request failed');
        return sendJson(res, 500, normalizeError(err));
      }
    }
  );

  attachRoute(
    app,
    'post',
    '/api/tc/showing-feedback/webhook',
    async (req, res) => {
      try {
        const agentId = getAgentId(req);
        if (!agentId) {
          return sendJson(res, 400, { error: 'agentId is required' });
        }

        const result = await tcShowingFeedback.recordFeedbackWebhook({
          req,
          deps,
          agentId,
        });

        return sendJson(res, 200, {
          ok: true,
          ...((result && typeof result === 'object') ? result : { result }),
        });
      } catch (err) {
        deps.logger?.error?.({ err }, 'tc showing feedback webhook failed');
        return sendJson(res, 500, normalizeError(err));
      }
    }
  );
}

export default registerTcIntakeRoutes;