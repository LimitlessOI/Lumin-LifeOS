/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
export function registerTcBillingRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger, baseUrl } = deps || {};

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerTcBillingRoutes requires an Express app instance');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.pool');
  }

  const safeJson = (res, status, body) => {
    if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') return;
    return res.status(status).json(body);
  };

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

  app.post('/api/tc/billing/subscribe', requireKey, async (req, res) => {
    try {
      const prompt = [
        'Create a Stripe billing subscription for TC billing.',
        'Return a concise JSON object with keys: action, agentId, customerId, subscriptionId, planTier, status, payload.',
        'Use only information available from the request body.',
        `Request body: ${JSON.stringify(req.body ?? {})}`,
      ].join('\n');

      const aiResult = callCouncilMember
        ? await callCouncilMember('tcBilling.createSubscription', prompt, { baseUrl })
        : null;

      const payload = {
        request: req.body ?? {},
        ai: aiResult,
      };

      const agentId = req.body?.agentId ?? req.body?.agent_id ?? null;
      if (!agentId) {
        return safeJson(res, 400, { error: 'agentId is required' });
      }

      const status = req.body?.status ?? 'pending';
      const query = `
        INSERT INTO tc_billing_subscriptions (agent_id, status, payload)
        VALUES ($1, $2, $3)
        RETURNING id, agent_id, status, payload, created_at, updated_at
      `;
      const result = await pool.query(query, [agentId, status, JSON.stringify(payload)]);

      logger?.info?.({ agentId, subscriptionId: result.rows?.[0]?.id }, 'tc billing subscription created');
      return safeJson(res, 200, {
        ok: true,
        subscription: {
          ...result.rows[0],
          payload: parseMaybeJson(result.rows[0]?.payload),
        },
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing subscribe failed');
      return safeJson(res, 500, { error: 'failed_to_create_subscription' });
    }
  });

  app.post(
    '/api/tc/billing/webhook',
    async (req, res, next) => {
      try {
        const rawEvent = req.body;
        const eventId = rawEvent?.id ?? rawEvent?.event_id ?? null;
        const eventType = rawEvent?.type ?? rawEvent?.event_type ?? 'unknown';

        if (eventId) {
          await pool.query(
            `
              INSERT INTO stripe_webhook_events (event_id, event_type, payload, raw_event)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT DO NOTHING
            `,
            [eventId, eventType, JSON.stringify(rawEvent ?? {}), typeof req.body === 'string' ? req.body : JSON.stringify(rawEvent ?? {})]
          );
        }

        if (callCouncilMember) {
          await callCouncilMember(
            'tcBilling.handleStripeWebhook',
            `Process this Stripe webhook event for billing state updates:\n${JSON.stringify(rawEvent ?? {})}`,
            { baseUrl }
          );
        }

        return safeJson(res, 200, { ok: true });
      } catch (error) {
        logger?.error?.({ err: error }, 'tc billing webhook failed');
        return safeJson(res, 500, { error: 'failed_to_process_webhook' });
      }
    }
  );

  app.get('/api/tc/billing/status/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params || {};
      if (!agentId) {
        return safeJson(res, 400, { error: 'agentId is required' });
      }

      const result = await pool.query(
        `
          SELECT id, agent_id, status, payload, created_at, updated_at
          FROM tc_billing_subscriptions
          WHERE agent_id = $1
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          LIMIT 1
        `,
        [agentId]
      );

      const row = result.rows?.[0] || null;
      if (!row) {
        return safeJson(res, 200, { ok: true, subscription: null });
      }

      return safeJson(res, 200, {
        ok: true,
        subscription: {
          id: row.id,
          agentId: row.agent_id,
          status: row.status,
          payload: parseMaybeJson(row.payload),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing status failed');
      return safeJson(res, 500, { error: 'failed_to_fetch_status' });
    }
  });
}

export default registerTcBillingRoutes;