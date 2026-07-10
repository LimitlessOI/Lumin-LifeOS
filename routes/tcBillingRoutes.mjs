/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
export function registerTcBillingRoutes(app, deps) {
  if (!app || !deps) return;

  const { pool, requireKey, callCouncilMember, logger } = deps;

  app.post('/api/tc/billing/subscribe', requireKey, async (req, res) => {
    try {
      const prompt = JSON.stringify({
        task: 'createSubscription',
        body: req.body ?? null,
        params: req.params ?? null,
        query: req.query ?? null,
      });

      const result = await callCouncilMember('tcBilling', prompt, {
        route: '/api/tc/billing/subscribe',
        method: 'POST',
      });

      return res.status(200).json({ ok: true, result });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing subscribe failed');
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  app.post(
    '/api/tc/billing/webhook',
    async (req, res, next) => {
      try {
        next();
      } catch (error) {
        next(error);
      }
    },
    async (req, res) => {
      try {
        const prompt = JSON.stringify({
          task: 'handleStripeWebhook',
          body: req.body ?? null,
          headers: req.headers ?? null,
          query: req.query ?? null,
        });

        const result = await callCouncilMember('tcBilling', prompt, {
          route: '/api/tc/billing/webhook',
          method: 'POST',
        });

        return res.status(200).json({ ok: true, result });
      } catch (error) {
        logger?.error?.({ err: error }, 'tc billing webhook failed');
        return res.status(500).json({ ok: false, error: 'internal_error' });
      }
    }
  );

  app.get('/api/tc/billing/status/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params || {};
      if (!agentId) {
        return res.status(400).json({ ok: false, error: 'missing_agentId' });
      }

      const { rows } = await pool.query(
        `select agent_id, status, payload, created_at, updated_at
         from tc_billing_subscriptions
         where agent_id = $1
         order by updated_at desc nulls last, created_at desc nulls last
         limit 1`,
        [agentId]
      );

      const row = rows?.[0] || null;
      return res.status(200).json({
        ok: true,
        agentId,
        currentPlan: row?.payload?.plan_tier ?? row?.payload?.plan ?? null,
        status: row?.status ?? null,
        subscription: row,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing status failed');
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });
}

export default registerTcBillingRoutes;