/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
export function registerTcBillingRoutes(app, deps) {
  const pool = deps?.pool;
  const requireKey = deps?.requireKey;
  const logger = deps?.logger ?? console;

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerTcBillingRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.pool');
  }

  const asyncHandler = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      logger?.error?.({ err }, 'tcBilling route error');
      const statusCode = err?.statusCode || err?.status || 500;
      res.status(statusCode).json({
        error: err?.message || 'Internal Server Error',
      });
    }
  };

  const createSubscription = asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const agentId = body.agentId ?? body.agent_id ?? req.query?.agentId ?? req.query?.agent_id;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const payload = {
      ...body,
      source: 'tcBilling.createSubscription',
    };

    const result = await pool.query(
      `
        INSERT INTO tc_billing_subscriptions (agent_id, status, payload)
        VALUES ($1, $2, $3)
        RETURNING id, agent_id, status, payload, created_at, updated_at
      `,
      [agentId, 'pending', payload]
    );

    return res.status(200).json({
      ok: true,
      subscription: result.rows[0] ?? null,
    });
  });

  const handleStripeWebhook = asyncHandler(async (req, res) => {
    const rawEvent = req.body;
    const eventId =
      rawEvent?.id ??
      rawEvent?.event_id ??
      req.headers['stripe-event-id'] ??
      req.headers['stripe-signature'] ??
      null;
    const eventType = rawEvent?.type ?? rawEvent?.event_type ?? 'unknown';

    await pool.query(
      `
        INSERT INTO stripe_webhook_events (event_id, event_type, payload, raw_event)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
      [String(eventId ?? ''), String(eventType), rawEvent ?? null, rawEvent ?? null]
    );

    return res.status(200).json({ ok: true });
  });

  const getStatus = asyncHandler(async (req, res) => {
    const agentId = req.params?.agentId;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const result = await pool.query(
      `
        SELECT id, agent_id, status, payload, created_at, updated_at
        FROM tc_billing_subscriptions
        WHERE agent_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [agentId]
    );

    const row = result.rows[0] ?? null;
    return res.status(200).json({
      ok: true,
      agentId,
      plan: row?.payload?.plan_tier ?? row?.payload?.plan ?? null,
      status: row?.status ?? null,
      subscription: row,
    });
  });

  app.post('/api/tc/billing/subscribe', requireKey, createSubscription);
  app.post('/api/tc/billing/webhook', handleStripeWebhook);
  app.get('/api/tc/billing/status/:agentId', getStatus);

  return app;
}

export default registerTcBillingRoutes;