/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
export function registerTcBillingRoutes(app, deps) {
  const logger = deps?.logger ?? console;
  const pool = deps?.pool;
  const requireKey = deps?.requireKey;
  const callCouncilMember = deps?.callCouncilMember;
  const baseUrl = deps?.baseUrl;

  if (!app || typeof app.post !== "function" || typeof app.get !== "function") {
    throw new Error("registerTcBillingRoutes requires an Express app");
  }
  if (!pool || typeof pool.query !== "function") {
    throw new Error("registerTcBillingRoutes requires deps.pool");
  }

  const jsonBodyParser = typeof app.json === "function" ? app.json({ type: ["application/json", "application/*+json"] }) : undefined;

  function sendError(res, status, message, details) {
    const payload = { ok: false, error: message };
    if (details !== undefined) payload.details = details;
    return res.status(status).json(payload);
  }

  function safeJsonParse(value, fallback = null) {
    if (value == null) return fallback;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  async function createSubscription(req, res) {
    try {
      const body = req.body ?? {};
      const agentRegistryId = body.agentRegistryId ?? body.agent_registry_id ?? body.agentId ?? body.agent_id;
      const stripeCustomerId = body.stripeCustomerId ?? body.stripe_customer_id;
      const planTier = body.planTier ?? body.plan_tier ?? body.tier;
      const status = body.status ?? "active";

      if (!agentRegistryId || !stripeCustomerId || !planTier) {
        return sendError(res, 400, "Missing agentRegistryId, stripeCustomerId, or planTier");
      }

      const existing = await pool.query(
        "SELECT id, agent_registry_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, created_at, updated_at FROM stripe_subscriptions WHERE agent_registry_id = $1 LIMIT 1",
        [agentRegistryId]
      );

      const inserted = existing.rows[0]
        ? await pool.query(
            "UPDATE stripe_subscriptions SET stripe_customer_id = $1, plan_tier = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING id, agent_registry_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, created_at, updated_at",
            [stripeCustomerId, planTier, status, existing.rows[0].id]
          )
        : await pool.query(
            "INSERT INTO stripe_subscriptions (agent_registry_id, stripe_customer_id, plan_tier, status) VALUES ($1, $2, $3, $4) RETURNING id, agent_registry_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, created_at, updated_at",
            [agentRegistryId, stripeCustomerId, planTier, status]
          );

      const row = inserted.rows[0];

      if (body.enroll !== false) {
        await pool.query(
          `INSERT INTO enrolled_agents (agent_registry_id, onboarding_complete)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [agentRegistryId, false]
        ).catch(() => {});
      }

      return res.status(200).json({
        ok: true,
        subscription: row,
      });
    } catch (error) {
      logger.error?.({ err: error }, "tcBilling.createSubscription failed");
      return sendError(res, 500, "Failed to create subscription");
    }
  }

  async function handleStripeWebhook(req, res) {
    try {
      const rawEvent = req.body;
      const event = safeJsonParse(rawEvent, null);

      if (!event || typeof event !== "object") {
        return sendError(res, 400, "Invalid Stripe webhook payload");
      }

      const eventId = event.id ?? null;
      const eventType = event.type ?? null;
      if (!eventId || !eventType) {
        return sendError(res, 400, "Missing Stripe event id or type");
      }

      await pool.query(
        `INSERT INTO stripe_webhook_events (event_id, event_type, payload, raw_event)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, eventType, event, typeof rawEvent === "string" ? rawEvent : JSON.stringify(event)]
      ).catch(async () => {
        await pool.query(
          `INSERT INTO stripe_webhook_events (event_id, event_type, payload, raw_event)
           VALUES ($1, $2, $3, $4)`,
          [eventId, eventType, event, typeof rawEvent === "string" ? rawEvent : JSON.stringify(event)]
        );
      });

      const customerId = event.data?.object?.customer ?? null;
      const subscriptionId = event.data?.object?.subscription ?? event.data?.object?.id ?? null;
      const subscriptionStatus = event.data?.object?.status ?? null;
      const planTier = event.data?.object?.plan?.nickname ?? event.data?.object?.items?.data?.[0]?.price?.nickname ?? null;

      if (customerId) {
        await pool.query(
          `UPDATE stripe_subscriptions
           SET stripe_subscription_id = COALESCE($1, stripe_subscription_id),
               status = COALESCE($2, status),
               plan_tier = COALESCE($3, plan_tier),
               updated_at = NOW()
           WHERE stripe_customer_id = $4`,
          [subscriptionId, subscriptionStatus, planTier, customerId]
        );
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      logger.error?.({ err: error }, "tcBilling.handleStripeWebhook failed");
      return sendError(res, 500, "Failed to handle webhook");
    }
  }

  async function getStatus(req, res) {
    try {
      const agentId = req.params?.agentId;
      if (!agentId) return sendError(res, 400, "Missing agentId");

      const result = await pool.query(
        "SELECT agent_registry_id, plan_tier, status, stripe_customer_id, stripe_subscription_id, created_at, updated_at FROM stripe_subscriptions WHERE agent_registry_id = $1 ORDER BY updated_at DESC, created_at DESC LIMIT 1",
        [agentId]
      );

      const row = result.rows[0] ?? null;

      return res.status(200).json({
        ok: true,
        agentId,
        billing: row
          ? {
              plan: row.plan_tier,
              status: row.status,
              stripeCustomerId: row.stripe_customer_id,
              stripeSubscriptionId: row.stripe_subscription_id,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }
          : null,
      });
    } catch (error) {
      logger.error?.({ err: error }, "tcBilling.getStatus failed");
      return sendError(res, 500, "Failed to load billing status");
    }
  }

  app.post("/api/tc/billing/subscribe", typeof requireKey === "function" ? requireKey : (req, res, next) => next(), jsonBodyParser ?? ((req, res, next) => next()), createSubscription);
  app.post("/api/tc/billing/webhook", jsonBodyParser ?? ((req, res, next) => next()), handleStripeWebhook);
  app.get("/api/tc/billing/status/:agentId", getStatus);

  if (baseUrl) {
    logger.info?.({ baseUrl }, "tcBilling routes registered");
  }
}

export default registerTcBillingRoutes;