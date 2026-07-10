/**
 * SYNOPSIS: Exports createSubscription — services/tcBilling.mjs.
 */
export async function createSubscription(deps, { agentId, planTier, stripePaymentMethodId }) {
  if (!deps?.pool) throw new Error('deps.pool is required');
  if (!deps?.stripe) throw new Error('deps.stripe is required');
  if (!agentId) throw new Error('agentId is required');
  if (!planTier) throw new Error('planTier is required');
  if (!stripePaymentMethodId) throw new Error('stripePaymentMethodId is required');

  const tierRes = await deps.pool.query(
    'select * from tc_pricing_tiers where plan_tier = $1 limit 1',
    [planTier]
  );

  if (!tierRes.rows.length) {
    throw new Error(`Unknown plan tier: ${planTier}`);
  }

  const tier = tierRes.rows[0];
  const priceId = tier.stripe_price_id || tier.price_id || tier.stripe_price;
  if (!priceId) {
    throw new Error(`No Stripe price configured for plan tier: ${planTier}`);
  }

  const customerRes = await deps.pool.query(
    'select stripe_customer_id from billing_projects where owner_id = $1 order by created_at asc limit 1',
    [agentId]
  );

  const stripeCustomerId = customerRes.rows[0]?.stripe_customer_id;
  if (!stripeCustomerId) {
    throw new Error(`No Stripe customer found for agent: ${agentId}`);
  }

  const subscription = await deps.stripe.subscriptions.create({
    customer: stripeCustomerId,
    default_payment_method: stripePaymentMethodId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  await deps.pool.query(
    `insert into tc_billing_subscriptions (agent_id, status, payload)
     values ($1, $2, $3)`,
    [agentId, subscription.status || 'unknown', subscription]
  );

  return { subscriptionId: subscription.id, status: subscription.status };
}

export async function handleStripeWebhook(deps, event) {
  if (!deps?.pool) throw new Error('deps.pool is required');
  if (!event || !event.type) throw new Error('event is required');

  const subscription = event.data?.object;
  if (!subscription?.id) return { processed: false };

  if (
    event.type !== 'customer.subscription.updated' &&
    event.type !== 'customer.subscription.deleted'
  ) {
    return { processed: false };
  }

  const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status || 'unknown';

  await deps.pool.query(
    `update tc_billing_subscriptions
     set status = $1,
         payload = $2,
         updated_at = now()
     where (payload->>'id') = $3`,
    [status, subscription, subscription.id]
  );

  return { processed: true, subscriptionId: subscription.id, status };
}