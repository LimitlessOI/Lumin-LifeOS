/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
export function registerTcBillingRoutes(app, deps) {
  const {
    pool,
    logger = console,
    requireKey,
    callCouncilMember,
    commitToGitHub,
    commitManyToGitHub,
    baseUrl,
  } = deps || {};

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerTcBillingRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.pool');
  }

  const log = logger && typeof logger.info === 'function' ? logger : console;

  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  const requireKeyMiddleware = typeof requireKey === 'function' ? requireKey : (req, res, next) => next();

  const parseMaybeJson = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const createSubscription = async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const agentId = body.agentId ?? body.agent_id ?? req.query.agentId ?? req.query.agent_id;
      if (!agentId) {
        return res.status(400).json({ ok: false, error: 'agentId is required' });
      }

      const prompt = JSON.stringify(
        {
          task: 'createSubscription',
          agentId,
          body,
          baseUrl: baseUrl || null,
        },
        null,
        2
      );

      if (typeof callCouncilMember !== 'function') {
        return res.status(500).json({ ok: false, error: 'AI council member unavailable' });
      }

      const result = await callCouncilMember('tcBilling', prompt, { route: 'subscribe', agentId });

      let subscriptionPayload = null;
      try {
        subscriptionPayload = JSON.parse(result);
      } catch {
        subscriptionPayload = { raw: result };
      }

      await pool.query(
        `insert into tc_billing_subscriptions (agent_id, status, payload)
         values ($1, $2, $3)
         returning id, agent_id, status, payload, created_at, updated_at`,
        [agentId, subscriptionPayload?.status || 'created', subscriptionPayload]
      );

      return res.status(200).json({ ok: true, result: subscriptionPayload });
    } catch (error) {
      log.error?.({ err: error }, 'tcBilling.createSubscription failed');
      return res.status(500).json({ ok: false, error: error.message || 'Failed to create subscription' });
    }
  };

  const handleStripeWebhook = async (req, res) => {
    try {
      const rawEvent = req.body;
      const event = parseMaybeJson(rawEvent);
      const eventId = event?.id || event?.event_id || null;
      const eventType = event?.type || event?.event_type || 'unknown';

      await pool.query(
        `insert into stripe_webhook_events (event_id, event_type, payload, raw_event)
         values ($1, $2, $3, $4)
         returning id, event_id, event_type, created_at`,
        [eventId, eventType, event, typeof rawEvent === 'string' ? rawEvent : JSON.stringify(rawEvent ?? null)]
      );

      if (typeof callCouncilMember === 'function') {
        const prompt = JSON.stringify({ task: 'handleStripeWebhook', event }, null, 2);
        const result = await callCouncilMember('tcBilling', prompt, { route: 'webhook', eventType, eventId });
        return res.status(200).json({ ok: true, result: parseMaybeJson(result) });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      log.error?.({ err: error }, 'tcBilling.handleStripeWebhook failed');
      return res.status(500).json({ ok: false, error: error.message || 'Failed to handle webhook' });
    }
  };

  const getStatus = async (req, res) => {
    try {
      const agentId = req.params?.agentId;
      if (!agentId) {
        return res.status(400).json({ ok: false, error: 'agentId is required' });
      }

      const { rows } = await pool.query(
        `select agent_id, status, payload, created_at, updated_at
         from tc_billing_subscriptions
         where agent_id = $1
         order by created_at desc
         limit 1`,
        [agentId]
      );

      const row = rows[0] || null;
      return res.status(200).json({
        ok: true,
        agentId,
        plan: row?.payload?.plan_tier ?? row?.payload?.plan ?? null,
        status: row?.status ?? null,
        subscription: row,
      });
    } catch (error) {
      log.error?.({ err: error }, 'tcBilling.getStatus failed');
      return res.status(500).json({ ok: false, error: error.message || 'Failed to fetch status' });
    }
  };

  app.post('/api/tc/billing/subscribe', requireKeyMiddleware, asyncHandler(createSubscription));
  app.post('/api/tc/billing/webhook', asyncHandler(handleStripeWebhook));
  app.get('/api/tc/billing/status/:agentId', asyncHandler(getStatus));

  return app;
}

export default registerTcBillingRoutes;