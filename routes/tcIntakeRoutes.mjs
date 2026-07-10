/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tcIntakeRoutes.mjs).
 */
import tcIntakePipeline from "../services/tcIntakePipeline.mjs";
import tcDocumentQA from "../services/tcDocumentQA.mjs";
import tcOfferPrep from "../services/tcOfferPrep.mjs";
import tcMobileApproval from "../services/tcMobileApproval.mjs";
import tcShowingFeedback from "../services/tcShowingFeedback.mjs";

function normalizeAgentId(body) {
  return body?.agentId ?? body?.agent_id ?? body?.agentID ?? null;
}

function asJsonMessage(err) {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Unexpected error";
}

function withAsyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
      res.status(status).json({ ok: false, error: asJsonMessage(err) });
    }
  };
}

async function requireAgentId(req, res, next) {
  const agentId = normalizeAgentId(req.body);
  if (!agentId) {
    res.status(400).json({ ok: false, error: "agentId is required" });
    return;
  }
  req.body = req.body || {};
  req.body.agentId = agentId;
  next();
}

export function registerTcIntakeRoutes(app, deps) {
  if (!app || !deps) {
    throw new Error("registerTcIntakeRoutes requires app and deps");
  }

  app.post(
    "/api/tc/intake/run",
    requireAgentId,
    withAsyncRoute(async (req, res) => {
      const result = await tcIntakePipeline.runIntakePipeline(req.body, deps);
      res.json({ ok: true, result });
    }),
  );

  app.post(
    "/api/tc/intake/document-qa",
    requireAgentId,
    withAsyncRoute(async (req, res) => {
      const result = await tcDocumentQA.runDocumentQA(req.body, deps);
      res.json({ ok: true, result });
    }),
  );

  app.post(
    "/api/tc/offer-prep",
    requireAgentId,
    withAsyncRoute(async (req, res) => {
      const result = await tcOfferPrep.runOfferPrep(req.body, deps);
      res.json({ ok: true, result });
    }),
  );

  app.post(
    "/api/tc/approvals",
    deps.requireKey,
    requireAgentId,
    withAsyncRoute(async (req, res) => {
      const result = await tcMobileApproval.createApprovalRequest(req.body, deps);
      res.json({ ok: true, result });
    }),
  );

  app.patch(
    "/api/tc/approvals/:id",
    deps.requireKey,
    requireAgentId,
    withAsyncRoute(async (req, res) => {
      const result = await tcMobileApproval.processApproval(
        { ...req.body, id: req.params.id },
        deps,
      );
      res.json({ ok: true, result });
    }),
  );

  app.post(
    "/api/tc/showing-feedback",
    requireAgentId,
    withAsyncRoute(async (req, res) => {
      const result = await tcShowingFeedback.sendShowingFeedbackRequest(req.body, deps);
      res.json({ ok: true, result });
    }),
  );

  app.post(
    "/api/tc/showing-feedback/webhook",
    withAsyncRoute(async (req, res) => {
      const result = await tcShowingFeedback.recordFeedbackWebhook(req.body, deps);
      res.json({ ok: true, result });
    }),
  );

  return app;
}

export default registerTcIntakeRoutes;