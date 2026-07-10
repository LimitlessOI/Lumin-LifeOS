/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
export function registerTcBillingRoutes(app, deps) {
  const pool = deps?.pool;
  const requireKey = deps?.requireKey;
  const callCouncilMember = deps?.callCouncilMember;
  const logger = deps?.logger;

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerTcBillingRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.pool');
  }

  const jsonHandler = (fn) => async (req, res) => {
    try {
      const result = await fn(req, res);
      if (res.headersSent) return;
      if (result === undefined) {
        return res.status(200).json({ ok: true });
      }
      return res.status(200).json(result);
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'tcBilling route failed');
      if (res.headersSent) return;
      return res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
    }
  };

  app.post(
    '/api/tc/billing/subscribe',
    requireKey,
    jsonHandler(async (req) => {
      const prompt = JSON.stringify({
        route: 'tcBilling.createSubscription',
        body: req.body ?? null,
        baseUrl: deps?.baseUrl ?? null,
      });

      const aiResult = callCouncilMember
        ? await callCouncilMember('tcBilling', prompt, { baseUrl: deps?.baseUrl })
        : null;

      return {
        ok: true,
        action: 'createSubscription',
        result: aiResult,
      };
    })
  );

  app.post(
    '/api/tc/billing/webhook',
    async (req, res) => {
      try {
        const rawBody =
          typeof req.body === 'string'
            ? req.body
            : Buffer.isBuffer(req.body)
              ? req.body.toString('utf8')
              : req.rawBody?.toString?.('utf8') ?? JSON.stringify(req.body ?? {});

        const prompt = JSON.stringify({
          route: 'tcBilling.handleStripeWebhook',
          rawBody,
          headers: {
            'stripe-signature': req.headers['stripe-signature'] || null,
            'content-type': req.headers['content-type'] || null,
          },
        });

        const aiResult = callCouncilMember
          ? await callCouncilMember('tcBilling', prompt, { baseUrl: deps?.baseUrl })
          : null;

        return res.status(200).json({
          ok: true,
          action: 'handleStripeWebhook',
          result: aiResult,
        });
      } catch (err) {
        if (logger?.error) logger.error({ err }, 'tcBilling webhook failed');
        return res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
      }
    }
  );

  app.get(
    '/api/tc/billing/status/:agentId',
    jsonHandler(async (req) => {
      const agentId = req.params?.agentId;
      if (!agentId) {
        return { ok: false, error: 'agentId is required' };
      }

      const result = await pool.query(
        'SELECT plan_tier, status, stripe_subscription_id, stripe_customer_id, created_at, updated_at FROM stripe_subscriptions WHERE agent_registry_id = $1 ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1',
        [agentId]
      );

      const row = result.rows?.[0] || null;

      return {
        ok: true,
        agentId,
        subscription: row
          ? {
              plan_tier: row.plan_tier,
              status: row.status,
              stripe_subscription_id: row.stripe_subscription_id,
              stripe_customer_id: row.stripe_customer_id,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }
          : null,
      };
    })
  );
}

export default registerTcBillingRoutes;