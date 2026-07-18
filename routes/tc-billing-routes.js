/**
 * SYNOPSIS: Registers TcBillingRoutes routes/handlers (routes/tc-billing-routes.js).
 */
const DEFAULT_ROUTE_PREFIX = '/api/tc/billing';

function json(res, status, body) {
  return res.status(status).json(body);
}

async function createCheckoutSessionHandler(req, res, deps) {
  try {
    const stripeBilling = deps.stripeBilling;
    if (!stripeBilling || typeof stripeBilling.createCheckoutSession !== 'function') {
      return json(res, 500, { error: 'stripeBilling.createCheckoutSession unavailable' });
    }

    const result = await stripeBilling.createCheckoutSession(req.body ?? {}, deps);
    const url = result && typeof result === 'object' ? result.url : undefined;

    if (!url) {
      return json(res, 500, { error: 'Checkout session url missing' });
    }

    return json(res, 200, { url });
  } catch (error) {
    deps.logger?.error?.({ err: error }, 'tc billing checkout failed');
    return json(res, 500, { error: 'Failed to create checkout session' });
  }
}

async function enrollAgentHandler(req, res, deps) {
  try {
    const { agentRegistryId, stripeSubscriptionId, planTier } = req.body ?? {};

    if (!agentRegistryId || !stripeSubscriptionId || !planTier) {
      return json(res, 400, {
        error: 'agentRegistryId, stripeSubscriptionId, and planTier are required',
      });
    }

    const stripeBilling = deps.stripeBilling;
    if (!stripeBilling || typeof stripeBilling.enrollAgent !== 'function') {
      return json(res, 500, { error: 'stripeBilling.enrollAgent unavailable' });
    }

    const enrolled = await stripeBilling.enrollAgent(
      { agentRegistryId, stripeSubscriptionId, planTier },
      deps,
    );

    return json(res, 200, { enrolled });
  } catch (error) {
    deps.logger?.error?.({ err: error }, 'tc billing enroll failed');
    return json(res, 500, { error: 'Failed to enroll agent' });
  }
}

async function webhookHandler(req, res, deps) {
  try {
    const signature = req.get('stripe-signature');
    const rawBody = req.body;

    if (typeof deps.validateWebhookSignature !== 'function') {
      return json(res, 500, { error: 'validateWebhookSignature unavailable' });
    }

    const event = await deps.validateWebhookSignature(rawBody, signature);
    if (!event || !event.type) {
      return json(res, 400, { error: 'Invalid webhook event' });
    }

    const subscriptionStatuses = new Set([
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'checkout.session.completed',
      'invoice.paid',
      'invoice.payment_failed',
    ]);

    if (!subscriptionStatuses.has(event.type)) {
      return json(res, 200, { received: true, ignored: true });
    }

    const subscription =
      event.data?.object?.subscription && typeof event.data.object.subscription === 'object'
        ? event.data.object.subscription
        : event.data?.object;

    const stripeSubscriptionId =
      subscription?.id ||
      event.data?.object?.subscription ||
      event.data?.object?.subscription_id ||
      null;

    const status = subscription?.status || event.data?.object?.status || null;

    if (stripeSubscriptionId && status && deps.pool?.query) {
      await deps.pool.query(
        `update boldtrail_agents
         set subscription_status = $2, updated_at = now()
         where stripe_subscription_id = $1`,
        [stripeSubscriptionId, status],
      );
    }

    return json(res, 200, { received: true });
  } catch (error) {
    deps.logger?.error?.({ err: error }, 'tc billing webhook failed');
    return json(res, 400, { error: 'Webhook validation failed' });
  }
}

export function registerTcBillingRoutes(app, deps) {
  const requireAuth = deps.requireAuth || deps.requireKey;
  if (typeof requireAuth !== 'function') {
    throw new Error('registerTcBillingRoutes requires deps.requireAuth or deps.requireKey');
  }

  app.post(
    `${DEFAULT_ROUTE_PREFIX}/checkout`,
    requireAuth,
    (req, res) => createCheckoutSessionHandler(req, res, deps),
  );

  app.post(
    `${DEFAULT_ROUTE_PREFIX}/enroll`,
    requireAuth,
    (req, res) => enrollAgentHandler(req, res, deps),
  );

  app.post(`${DEFAULT_ROUTE_PREFIX}/webhook`, expressRawWebhookMiddleware, (req, res) =>
    webhookHandler(req, res, deps),
  );
}

function expressRawWebhookMiddleware(req, res, next) {
  if (typeof next === 'function') next();
}

export default registerTcBillingRoutes;