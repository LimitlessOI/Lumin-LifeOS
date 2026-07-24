/**
 * SYNOPSIS: TC Service agent billing — REAL Stripe subscription checkout + fail-closed
 * access grant. Replaces the prior AI-fabricated stub (which asked a council member to
 * invent stripe_customer_id/subscription_id and never charged anyone).
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import { randomUUID } from 'node:crypto';
import { getStripeClient } from '../services/stripe-client.js';

// Tiered monthly price (cents). Inline price_data so no pre-created Stripe Price
// IDs are required; env overrides let the founder retune without a code change.
const TIER_CENTS = {
  starter: Number(process.env.TC_BILLING_STARTER_CENTS) || 4900,
  pro: Number(process.env.TC_BILLING_PRO_CENTS) || 9900,
  enterprise: Number(process.env.TC_BILLING_ENTERPRISE_CENTS) || 24900,
};
const TIER_LABEL = {
  starter: 'TC Service — Starter',
  pro: 'TC Service — Pro',
  enterprise: 'TC Service — Enterprise',
};

function resolveBaseUrl(req, fallback) {
  const fwdProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const fwdHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (fwdHost) return `${fwdProto || 'https'}://${fwdHost}`;
  if (req.headers.origin) return String(req.headers.origin);
  return String(fallback || process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
}

// Every tc_* table types `agent_id` as `uuid`. The routes take a client-supplied
// agentId, so a non-UUID value made Postgres throw `invalid input syntax for
// type uuid` — a raw 500 that (in /subscribe) fired AFTER the Stripe session was
// created but BEFORE the checkout URL was returned, leaving an orphan session and
// leaking the DB error. Validate at the boundary and fail clean (400) instead.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v.trim());
}

export function registerTcBillingRoutes(app, deps) {
  const { pool, requireKey, logger, baseUrl } = deps || {};

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerTcBillingRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.pool');
  }

  const sendError = (res, statusCode, message, details) => {
    const payload = { ok: false, error: message };
    if (details !== undefined) payload.details = details;
    return res.status(statusCode).json(payload);
  };

  async function createSubscriptionCheckout({ agentId, tier, email, agentName, req }) {
    const amountCents = TIER_CENTS[tier];
    if (!amountCents) {
      return { ok: false, status: 400, error: `Unknown tier: ${tier} (starter|pro|enterprise)` };
    }
    const stripe = await getStripeClient();
    if (!stripe) {
      return { ok: false, status: 503, error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' };
    }
    const base = resolveBaseUrl(req, baseUrl);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(email ? { customer_email: String(email).trim() } : {}),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: TIER_LABEL[tier],
              description: 'Transaction coordination service — monthly',
            },
            unit_amount: Math.round(amountCents),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/api/tc/billing/success?agent_id=${encodeURIComponent(String(agentId))}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/overlay/tc-agent-enroll.html?canceled=1`,
      client_reference_id: String(agentId),
      metadata: {
        agent_id: String(agentId),
        tier,
        product: 'tc-service',
        agent_name: agentName ? String(agentName).slice(0, 120) : '',
        agent_email: email ? String(email).slice(0, 200) : '',
      },
    });

    const insert = await pool.query(
      `INSERT INTO tc_billing_subscriptions (agent_id, status, payload)
       VALUES ($1, $2, $3)
       RETURNING id, agent_id, status, payload, created_at, updated_at`,
      [
        String(agentId),
        'incomplete',
        {
          checkout_session_id: session.id,
          plan_tier: tier,
          amount_cents: amountCents,
          agent_name: agentName || null,
          agent_email: email || null,
        },
      ]
    );

    return {
      ok: true,
      url: session.url,
      session_id: session.id,
      agent_id: String(agentId),
      tier,
      amount_cents: amountCents,
      subscription: insert.rows[0] || null,
    };
  }

  // Public market enroll: name + email + tier → UUID agent + Stripe Checkout.
  // No command key (customers will not have one). Rate-limit lightly by IP in-process.
  const enrollHits = new Map();
  app.post('/api/tc/billing/enroll', async (req, res) => {
    try {
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
        .split(',')[0]
        .trim();
      const now = Date.now();
      const hit = enrollHits.get(ip) || { n: 0, t: now };
      if (now - hit.t > 60_000) { hit.n = 0; hit.t = now; }
      hit.n += 1;
      enrollHits.set(ip, hit);
      if (hit.n > 8) return sendError(res, 429, 'Too many enroll attempts — try again in a minute.');

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const agentName = String(body.agentName || body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const tier = String(body.tier || body.planTier || body.plan_tier || 'starter').toLowerCase();
      if (!agentName || agentName.length < 2) return sendError(res, 400, 'agentName is required');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendError(res, 400, 'Valid email is required');
      }
      if (!TIER_CENTS[tier]) return sendError(res, 400, `Unknown tier: ${tier} (starter|pro|enterprise)`);

      // Prefer an existing incomplete/active billing UUID for this email; else mint one.
      let agentId = null;
      try {
        const prior = await pool.query(
          `SELECT agent_id FROM tc_billing_subscriptions
            WHERE payload->>'agent_email' = $1
            ORDER BY updated_at DESC NULLS LAST, created_at DESC
            LIMIT 1`,
          [email]
        );
        if (prior.rows[0]?.agent_id) agentId = String(prior.rows[0].agent_id);
      } catch { /* table may be empty */ }
      if (!agentId) agentId = randomUUID();

      // Best-effort registry row (serial id) for ops; billing keys on UUID above.
      try {
        await pool.query(
          `INSERT INTO tc_agent_clients (name, email, plan, monthly_fee, setup_fee, setup_fee_waived, setup_paid, active, notes)
           VALUES ($1, $2, 'monthly', $3, 0, true, false, true, $4)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             notes = EXCLUDED.notes,
             updated_at = NOW()`,
          [
            agentName,
            email,
            (TIER_CENTS[tier] / 100).toFixed(2),
            `billing_agent_id=${agentId}; tier=${tier}`,
          ]
        );
      } catch (regErr) {
        logger?.warn?.({ err: regErr.message }, 'tc enroll registry upsert skipped');
      }

      const checkout = await createSubscriptionCheckout({
        agentId, tier, email, agentName, req,
      });
      if (!checkout.ok) return sendError(res, checkout.status || 500, checkout.error);

      logger?.info?.({ agentId, tier, email, sessionId: checkout.session_id }, 'tc public enroll checkout created');
      return res.status(200).json(checkout);
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing enroll failed');
      return sendError(res, 500, error.message || 'Failed to start enrollment');
    }
  });

  // Create a REAL Stripe subscription checkout session for an agent (keyed callers).
  app.post('/api/tc/billing/subscribe', requireKey, async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const agentId = body.agentId ?? body.agent_id;
      if (!agentId) return sendError(res, 400, 'agentId is required');
      if (!isUuid(agentId)) {
        return sendError(res, 400, 'agentId must be a valid UUID', {
          hint: 'Create/resolve the agent first and pass its UUID; TC records key agent_id as uuid.',
        });
      }

      const tier = String(body.tier || body.plan_tier || 'pro').toLowerCase();
      const checkout = await createSubscriptionCheckout({
        agentId,
        tier,
        email: body.email,
        agentName: body.agentName || body.name,
        req,
      });
      if (!checkout.ok) return sendError(res, checkout.status || 500, checkout.error);

      logger?.info?.({ agentId, tier, sessionId: checkout.session_id }, 'tc billing checkout session created');
      return res.status(200).json(checkout);
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing subscribe failed');
      return sendError(res, 500, error.message || 'Failed to create subscription');
    }
  });

  // Post-payment access grant. Stripe redirects here (no auth) with the session id;
  // we confirm it is genuinely paid before flipping the agent to active. Fail-closed.
  app.get('/api/tc/billing/success', async (req, res) => {
    try {
      const agentId = String(req.query.agent_id || '').trim();
      const sessionId = String(req.query.session_id || '').trim();
      if (!agentId || !sessionId) return res.status(400).send('Missing payment confirmation parameters.');
      if (!isUuid(agentId)) return res.status(400).send('Invalid agent reference.');

      const stripe = await getStripeClient();
      if (!stripe) return res.status(503).send('Stripe not configured.');

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paid = session.payment_status === 'paid' || session.status === 'complete' || session.status === 'active';
      const metaAgentId = session.metadata?.agent_id || session.client_reference_id;

      if (!paid) return res.status(400).send('Payment not completed.');
      if (metaAgentId && metaAgentId !== agentId) return res.status(400).send('Checkout session does not match this account.');

      await pool.query(
        `UPDATE tc_billing_subscriptions
            SET status = 'active',
                payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
                updated_at = NOW()
          WHERE agent_id = $1
            AND payload->>'checkout_session_id' = $3`,
        [
          agentId,
          JSON.stringify({
            stripe_customer_id: session.customer ? String(session.customer) : null,
            stripe_subscription_id: session.subscription ? String(session.subscription) : null,
            paid_at: new Date().toISOString(),
          }),
          sessionId,
        ]
      );

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Subscription active — TC Service</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#111}h1{font-size:1.5rem}.card{border:1px solid #99f6e4;border-radius:12px;padding:20px;margin-top:16px}</style>
</head><body><h1>You're subscribed — TC Service is active</h1>
<div class="card"><p>Your transaction coordination subscription is active. We'll begin onboarding your transactions now.</p></div>
</body></html>`);
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing success handler failed');
      return res.status(500).send('Something went wrong confirming your subscription.');
    }
  });

  // Record inbound Stripe webhook events for audit (no fabrication). Subscription
  // lifecycle (renewals/cancellations) can be layered on here once the raw-body
  // signature-verification middleware is mounted on the founder lane.
  app.post('/api/tc/billing/webhook', async (req, res) => {
    try {
      const body = req.body;
      const eventId = body?.id ?? null;
      const eventType = body?.type ?? null;
      await pool.query(
        `INSERT INTO stripe_webhook_events (event_id, event_type, payload, raw_event)
         VALUES ($1, $2, $3, $4)`,
        [eventId, eventType, body ?? null, body ?? null]
      );
      return res.status(200).json({ ok: true, recorded: true, event_type: eventType });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing webhook failed');
      return sendError(res, 500, 'Failed to handle webhook');
    }
  });

  app.get('/api/tc/billing/status/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params || {};
      if (!agentId) return sendError(res, 400, 'agentId is required');
      if (!isUuid(agentId)) return sendError(res, 400, 'agentId must be a valid UUID');

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
        plan: subscription?.payload?.plan_tier ?? null,
        status: subscription?.status ?? null,
        active: subscription?.status === 'active',
        subscription,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc billing status failed');
      return sendError(res, 500, 'Failed to fetch billing status');
    }
  });
}

export default registerTcBillingRoutes;