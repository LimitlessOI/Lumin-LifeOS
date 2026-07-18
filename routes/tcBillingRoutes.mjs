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

  const sendError = (res, statusCode, message, details) => {
    const payload = { ok: false, error: message };
    if (details !== undefined) payload.details = details;
    return res.status(statusCode).json(payload);
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
        const body = req.body;
        const prompt = [
          'Handle a Stripe webhook for TC billing.',
          `baseUrl: ${baseUrl || ''}`,
          `payload: ${typeof body === 'string' ? body : JSON.stringify(body)}`,
          'Return a concise JSON object with fields: handled, event_id, event_type, status, raw.'
        ].join('\n');

        const aiText = await callCouncilMember('tcBilling.handleStripeWebhook', prompt, {});
        let aiResult = {};
        try {
          aiResult = aiText ? JSON.parse(aiText) : {};
        } catch {
          aiResult = { raw: aiText };
        }

        const eventId = aiResult.event_id ?? aiResult.eventId ?? null;
        const eventType = aiResult.event_type ?? aiResult.eventType ?? null;

        await pool.query(
          `INSERT INTO stripe_webhook_events (event_id, event_type, payload, raw_event)
           VALUES ($1, $2, $3, $4)
           RETURNING id, event_id, event_type, created_at`,
          [eventId, eventType, body ?? null, body ?? null]
        );

        return res.status(200).json({ ok: true, result: aiResult });
      } catch (error) {
        if (logger && typeof logger.error === 'function') {
          logger.error({ err: error }, 'tc billing webhook failed');
        }
        return sendError(res, 500, 'Failed to handle webhook');
      }
    }
  );

  app.get('/api/tc/billing/status/:agentId', async (req, res) => {
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