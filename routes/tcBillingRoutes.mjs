/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tcBillingRoutes.mjs).
 */
import express from 'express';

function getPool(deps) {
  return deps?.pool;
}

function getLogger(deps) {
  return deps?.logger || console;
}

function jsonSafeParse(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function sendError(res, status, message, extra) {
  const body = { ok: false, error: message };
  if (extra && typeof extra === 'object') Object.assign(body, extra);
  return res.status(status).json(body);
}

function registerSubscriptionRoutes(app, deps) {
  const pool = getPool(deps);
  const logger = getLogger(deps);

  app.post('/api/tc/billing/subscribe', deps.requireKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const payload = req.body && typeof req.body === 'object' ? req.body : {};
      const agentId = payload.agentId || payload.agent_id || payload.agentRegistryId || payload.agent_registry_id;
      const stripeCustomerId = payload.stripeCustomerId || payload.stripe_customer_id || null;
      const stripeSubscriptionId = payload.stripeSubscriptionId || payload.stripe_subscription_id || null;
      const planTier = payload.planTier || payload.plan_tier || null;
      const status = payload.status || 'active';

      if (!agentId) return sendError(res, 400, 'agentId is required');

      if (!pool) return sendError(res, 500, 'database pool unavailable');

      const result = await pool.query(
        `insert into stripe_subscriptions
           (agent_registry_id, stripe_customer_id, stripe_subscription_id, plan_tier, status)
         values ($1, $2, $3, $4, $5)
         returning id, agent_registry_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, created_at, updated_at`,
        [agentId, stripeCustomerId, stripeSubscriptionId, planTier, status]
      );

      return res.status(200).json({ ok: true, subscription: result.rows[0] || null });
    } catch (err) {
      logger.error({ err }, 'tc billing subscribe failed');
      return sendError(res, 500, 'failed to create subscription');
    }
  });

  app.get('/api/tc/billing/status/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      if (!agentId) return sendError(res, 400, 'agentId is required');
      if (!pool) return sendError(res, 500, 'database pool unavailable');

      const result = await pool.query(
        `select id, agent_id, status, payload, created_at, updated_at
           from tc_billing_subscriptions
          where agent_id = $1
          order by updated_at desc nulls last, created_at desc nulls last, id desc
          limit 1`,
        [agentId]
      );

      const row = result.rows[0] || null;
      return res.status(200).json({
        ok: true,
        subscription: row
          ? {
              id: row.id,
              agentId: row.agent_id,
              status: row.status,
              payload: jsonSafeParse(row.payload),
              createdAt: row.created_at,
              updatedAt: row.updated_at
            }
          : null
      });
    } catch (err) {
      logger.error({ err }, 'tc billing status failed');
      return sendError(res, 500, 'failed to fetch billing status');
    }
  });
}

function registerAgentEnrollmentRoutes(app, deps) {
  const pool = getPool(deps);
  const logger = getLogger(deps);

  app.post('/api/tc/billing/webhook', express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
    try {
      if (!pool) return sendError(res, 500, 'database pool unavailable');

      const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
      const rawText = rawBuffer.toString('utf8');
      let event = null;

      try {
        event = JSON.parse(rawText);
      } catch {
        event = { raw: rawText };
      }

      const eventId = event?.id || event?.event_id || null;
      const eventType = event?.type || event?.event_type || 'unknown';

      if (eventId) {
        const existing = await pool.query('select id from stripe_webhook_events where event_id = $1 limit 1', [eventId]);
        if (existing.rowCount > 0) {
          return res.status(200).json({ ok: true, duplicate: true });
        }
      }

      await pool.query(
        `insert into stripe_webhook_events (event_id, event_type, payload, raw_event)
         values ($1, $2, $3, $4)`,
        [eventId, eventType, JSON.stringify(event), rawText]
      );

      const agentRegistryId =
        event?.data?.object?.metadata?.agent_registry_id ||
        event?.data?.object?.metadata?.agentId ||
        event?.data?.object?.metadata?.agent_id ||
        event?.agent_registry_id ||
        null;

      if (agentRegistryId) {
        await pool.query(
          `insert into enrolled_agents (agent_registry_id, enrolled_at, onboarding_complete)
           values ($1, now(), false)
           on conflict do nothing`,
          [agentRegistryId]
        );
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      logger.error({ err }, 'tc billing webhook failed');
      return sendError(res, 500, 'failed to handle webhook');
    }
  });
}

export function registerTcBillingRoutes(app, deps) {
  registerSubscriptionRoutes(app, deps);
  registerAgentEnrollmentRoutes(app, deps);
}

export default registerTcBillingRoutes;