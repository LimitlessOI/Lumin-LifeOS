/**
 * SYNOPSIS: Exports createSubscription — services/tcBilling.mjs.
 */
export async function createSubscription(deps, { agentId, planTier, stripePaymentMethodId }) {
  if (!deps || !deps.pool || !deps.stripe) {
    throw new Error('Missing required deps.pool or deps.stripe');
  }
  if (!agentId || !planTier || !stripePaymentMethodId) {
    throw new Error('agentId, planTier, and stripePaymentMethodId are required');
  }

  const pricingRes = await deps.pool.query(
    `
      SELECT *
      FROM tc_pricing_tiers
      WHERE plan_tier = $1
      LIMIT 1
    `,
    [planTier]
  );

  const pricingTier = pricingRes.rows[0];
  if (!pricingTier) {
    throw new Error(`Unknown plan tier: ${planTier}`);
  }

  const priceId =
    pricingTier.stripe_price_id ||
    pricingTier.price_id ||
    pricingTier.price ||
    pricingTier.stripe_price;

  if (!priceId) {
    throw new Error(`No Stripe price mapping found for plan tier: ${planTier}`);
  }

  const agentRes = await deps.pool.query(
    `
      SELECT *
      FROM tc_billing_subscriptions
      WHERE agent_registry_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [agentId]
  );

  const existing = agentRes.rows[0];
  const stripeCustomerId = existing?.stripe_customer_id || null;

  const subscriptionPayload = {
    items: [{ price: priceId }],
    default_payment_method: stripePaymentMethodId,
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      agent_registry_id: String(agentId),
      plan_tier: String(planTier),
    },
  };

  if (stripeCustomerId) {
    subscriptionPayload.customer = stripeCustomerId;
  } else {
    subscriptionPayload.customer = undefined;
  }

  const subscription = await deps.stripe.subscriptions.create(subscriptionPayload);

  await deps.pool.query(
    `
      INSERT INTO tc_billing_subscriptions (
        agent_registry_id,
        stripe_customer_id,
        stripe_subscription_id,
        plan_tier,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [
      agentId,
      subscription.customer || stripeCustomerId || null,
      subscription.id,
      planTier,
      subscription.status || null,
    ]
  );

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
  };
}

export async function handleStripeWebhook(deps, event) {
  if (!deps || !deps.pool) {
    throw new Error('Missing required deps.pool');
  }
  if (!event || !event.type) {
    throw new Error('Invalid Stripe event');
  }

  if (
    event.type !== 'customer.subscription.updated' &&
    event.type !== 'customer.subscription.deleted'
  ) {
    return { handled: false };
  }

  const subscription = event.data && event.data.object ? event.data.object : null;
  if (!subscription || !subscription.id) {
    return { handled: false };
  }

  const nextStatus =
    event.type === 'customer.subscription.deleted'
      ? 'canceled'
      : subscription.status || null;

  const result = await deps.pool.query(
    `
      UPDATE tc_billing_subscriptions
      SET
        status = $1,
        stripe_customer_id = COALESCE($2, stripe_customer_id),
        plan_tier = COALESCE($3, plan_tier),
        updated_at = NOW()
      WHERE stripe_subscription_id = $4
      RETURNING id
    `,
    [
      nextStatus,
      subscription.customer || null,
      subscription.metadata && subscription.metadata.plan_tier
        ? subscription.metadata.plan_tier
        : null,
      subscription.id,
    ]
  );

  return {
    handled: true,
    updated: result.rowCount > 0,
    subscriptionId: subscription.id,
    status: nextStatus,
  };
}