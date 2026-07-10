/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
export function registerTcBillingRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger } = deps || {};

  if (!app || typeof app.post !== "function" || typeof app.get !== "function") {
    throw new Error("registerTcBillingRoutes requires an Express app");
  }
  if (!pool || typeof pool.query !== "function") {
    throw new Error("registerTcBillingRoutes requires deps.pool");
  }

  const jsonParseMaybe = (value) => {
    if (value == null) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const safeErrorMessage = (err) => {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    return err.message || "Unknown error";
  };

  const createSubscriptionHandler = async (req, res) => {
    try {
      const prompt = [
        "Create a Stripe billing subscription for the provided request payload.",
        "Return a concise JSON object with keys: status, message, and any useful details.",
        "Do not invent unsupported fields.",
        `Request body: ${JSON.stringify(req.body ?? {})}`,
      ].join("\n");

      const aiResponse = typeof callCouncilMember === "function"
        ? await callCouncilMember("tcBilling", prompt, { route: "createSubscription" })
        : null;

      return res.status(200).json({
        ok: true,
        route: "tcBilling.createSubscription",
        result: jsonParseMaybe(aiResponse),
      });
    } catch (err) {
      logger?.error?.({ err: safeErrorMessage(err) }, "tcBilling createSubscription failed");
      return res.status(500).json({
        ok: false,
        error: safeErrorMessage(err),
      });
    }
  };

  const webhookHandler = async (req, res) => {
    try {
      const prompt = [
        "Handle a Stripe webhook event for tc billing.",
        "Return a concise JSON object with keys: status, message, and any useful details.",
        "Do not invent unsupported fields.",
        `Headers: ${JSON.stringify(req.headers ?? {})}`,
        `Body: ${Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body ?? {})}`,
      ].join("\n");

      const aiResponse = typeof callCouncilMember === "function"
        ? await callCouncilMember("tcBilling", prompt, { route: "handleStripeWebhook" })
        : null;

      return res.status(200).json({
        ok: true,
        route: "tcBilling.handleStripeWebhook",
        result: jsonParseMaybe(aiResponse),
      });
    } catch (err) {
      logger?.error?.({ err: safeErrorMessage(err) }, "tcBilling webhook failed");
      return res.status(500).json({
        ok: false,
        error: safeErrorMessage(err),
      });
    }
  };

  const statusHandler = async (req, res) => {
    try {
      const { agentId } = req.params || {};
      if (!agentId) {
        return res.status(400).json({
          ok: false,
          error: "agentId is required",
        });
      }

      const { rows } = await pool.query(
        `
          SELECT id, agent_id, status, payload, created_at, updated_at
          FROM tc_billing_subscriptions
          WHERE agent_id = $1
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          LIMIT 1
        `,
        [agentId]
      );

      const row = rows?.[0] || null;
      if (!row) {
        return res.status(200).json({
          ok: true,
          agentId,
          subscription: null,
        });
      }

      return res.status(200).json({
        ok: true,
        agentId,
        subscription: {
          id: row.id,
          agentId: row.agent_id,
          status: row.status,
          payload: jsonParseMaybe(row.payload),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } catch (err) {
      logger?.error?.({ err: safeErrorMessage(err) }, "tcBilling status lookup failed");
      return res.status(500).json({
        ok: false,
        error: safeErrorMessage(err),
      });
    }
  };

  app.post("/api/tc/billing/subscribe", requireKey, createSubscriptionHandler);
  app.post("/api/tc/billing/webhook", webhookHandler);
  app.get("/api/tc/billing/status/:agentId", statusHandler);
}

export default registerTcBillingRoutes;