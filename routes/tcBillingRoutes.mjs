/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
export function registerTcBillingRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger, baseUrl } = deps || {};

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerTcBillingRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.pool');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.callCouncilMember');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.requireKey');
  }

  const sendError = (res, statusCode, message, details) => {
    const payload = { ok: false, error: message };
    if (details !== undefined) payload.details = details;
    return res.status(statusCode).json(payload);
  };

  const getHeader = (req, name) => {
    if (typeof req.get === 'function') return req.get(name);
    return req.headers?.[String(name).toLowerCase()];
  };

  const failWithStatus = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  };

  const validateStripeWebhook = async (req) => {
    const signature = getHeader(req, 'stripe-signature');
    if (!signature) {
      throw failWithStatus(400, 'Missing Stripe signature');
    }

    if (typeof deps.validateWebhookSignature === 'function') {
      return deps.validateWebhookSignature(req.rawBody ?? req.body, signature, req);
    }

    throw failWithStatus(503, 'Stripe webhook signature validation unavailable');
  };

  const loadStripeWebhookColumns = async () => {
    const result = await pool.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = $1`,
      ['stripe_webhook_events']
    );
    const columns = new Map();
    for (const row of result.rows || []) {
      if (row?.column_name) columns.set(row.column_name, row.data_type || null);
    }
    return columns;
  };

  const recordStripeWebhookEvent = async (event) => {
    const eventId = event?.id ?? event?.event_id ?? event?.eventId ?? null;
    const eventType = event?.type ?? event?.event_type ?? event?.eventType ?? null;
    if (!eventType) {
      throw failWithStatus(400, 'Invalid Stripe webhook event');
    }

    const columns = await loadStripeWebhookColumns();
    const payload = event && typeof event === 'object' ? event : { raw: event };
    const eventIdType = columns.get('event_id');

    if (columns.has('payload')) {
      if (!eventId) throw failWithStatus(400, 'Stripe event id is required');
      return pool.query(
        `INSERT INTO stripe_webhook_events (event_id, event_type, payload)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id, event_type, created_at`,
        [String(eventId), String(eventType), payload]
      );
    }

    if (columns.has('raw_event')) {
      if (eventId && eventIdType !== 'uuid') {
        return pool.query(
          `INSERT INTO stripe_webhook_events (event_id, event_type, raw_event)
           VALUES ($1, $2, $3)
           ON CONFLICT (event_id) DO NOTHING
           RETURNING event_id, event_type, created_at`,
          [String(eventId), String(eventType), payload]
        );
      }

      return pool.query(
        `INSERT INTO stripe_webhook_events (event_type, raw_event)
         VALUES ($1, $2)
         RETURNING event_id, event_type, created_at`,
        [String(eventType), payload]
      );
    }

    throw failWithStatus(500, 'stripe_webhook_events schema is unsupported');
  };

  app.post('/api/tc/billing/subscribe', requireKey, async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const agentId = body.agentId ?? body.agent_id;
      if (!agentId) return sendError(res, 400, 'agentId is required');

      const prompt = [
        'Create a Stripe billing subscription for the following request.',
        `baseUrl: ${baseUrl || ''}`,
        `agentId: ${agentId}`,
        `request: ${JSON.stringify(body)}`,
        'Return a concise JSON object with fields: stripe_customer_id, stripe_subscription_id, plan_tier, status, raw.'
      ].join('\n');

      const aiText = await callCouncilMember('tcBilling.createSubscription', prompt, { agentId });
      let aiResult = {};
      try {
        aiResult = aiText ? JSON.parse(aiText) : {};
      } catch {
        aiResult = { raw: aiText };
      }

      const stripeCustomerId = aiResult.stripe_customer_id ?? aiResult.stripeCustomerId ?? null;
      const stripeSubscriptionId = aiResult.stripe_subscription_id ?? aiResult.stripeSubscriptionId ?? null;
      const planTier = aiResult.plan_tier ?? aiResult.planTier ?? null;
      const status = aiResult.status ?? 'pending';

      const insert = await pool.query(
        `INSERT INTO tc_billing_subscriptions (agent_id, status, payload)
         VALUES ($1, $2, $3)
         RETURNING id, agent_id, status, payload, created_at, updated_at`,
        [String(agentId), String(status), aiResult]
      );

      const row = insert.rows[0] || null;

      if (logger && typeof logger.info === 'function') {
        logger.info({ agentId, subscriptionId: row?.id, status }, 'tc billing subscription created');
      }

      return res.status(200).json({
        ok: true,
        subscription: {
          ...row,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          plan_tier: planTier
        },
        ai: aiResult
      });
    } catch (error) {
      if (logger && typeof logger.error === 'function') {
        logger.error({ err: error }, 'tc billing subscribe failed');
      }
      return sendError(res, 500, 'Failed to create subscription');
    }
  });

  app.post(
    '/api/tc/billing/webhook',
    async (req, res) => {
      try {
        const event = await validateStripeWebhook(req);
        await recordStripeWebhookEvent(event);

        return res.status(200).json({
          ok: true,
          received: true,
          event_id: event?.id ?? event?.event_id ?? event?.eventId ?? null,
          event_type: event?.type ?? event?.event_type ?? event?.eventType ?? null
        });
      } catch (error) {
        if (logger && typeof logger.error === 'function') {
          logger.error({ err: error }, 'tc billing webhook failed');
        }
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 400;
        return sendError(res, statusCode, error?.message || 'Failed to handle webhook');
      }
    }
  );

  app.get('/api/tc/billing/status/:agentId', requireKey, async (req, res) => {
    try {
      const { agentId } = req.params || {};
      if (!agentId) return sendError(res, 400, 'agentId is required');

      const result = await pool.query(
        `SELECT id, agent_id, status, payload, created_at, updated_at
         FROM tc_billing_subscriptions
         WHERE agent_id = $1
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [String(agentId)]
      );

      const subscription = result.rows[0] || null;

      return res.status(200).json({
        ok: true,
        agentId: String(agentId),
        plan: subscription?.payload?.plan_tier ?? subscription?.payload?.planTier ?? null,
        status: subscription?.status ?? null,
        subscription
      });
    } catch (error) {
      if (logger && typeof logger.error === 'function') {
        logger.error({ err: error }, 'tc billing status failed');
      }
      return sendError(res, 500, 'Failed to fetch billing status');
    }
  });
}

export default registerTcBillingRoutes;