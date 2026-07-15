/**
 * SYNOPSIS: Exports createCheckoutSession — services/stripe-billing.js.
 */
import Stripe from 'stripe';
const PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};
const PARTNER_PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_PARTNER_PRICE_STARTER,
  pro: process.env.STRIPE_PARTNER_PRICE_PRO,
  enterprise: process.env.STRIPE_PARTNER_PRICE_ENTERPRISE,
};

function getDb(deps) {
  return deps.db ?? deps.pool;
}

function ensurePlanTier(planTier) {
  if (planTier !== 'starter' && planTier !== 'pro' && planTier !== 'enterprise') {
    throw new Error(`Unsupported plan tier: ${planTier}`);
  }
  return planTier;
}

function getStripeClient(deps) {
  if (deps.stripe) return deps.stripe;
  if (process.env.STRIPE_SECRET_KEY) {
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  throw new Error('Stripe client not available');
}

function getPriceId(planTier, isPartner = false) {
  const normalized = ensurePlanTier(planTier);
  const priceIds = isPartner ? PARTNER_PLAN_PRICE_IDS : PLAN_PRICE_IDS;
  const priceId = priceIds[normalized];
  if (!priceId) {
    throw new Error(`Missing Stripe price mapping for plan tier: ${normalized}`);
  }
  return priceId;
}

export async function createCheckoutSession(deps, { agentRegistryId, planTier }) {
  const stripe = getStripeClient(deps);
  const price = getPriceId(planTier);
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: `${deps.baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${deps.baseUrl}/billing/cancel`,
    client_reference_id: String(agentRegistryId),
    metadata: {
      agentRegistryId: String(agentRegistryId),
      planTier: ensurePlanTier(planTier),
    },
  });
}

export async function enrollAgent(deps, { agentRegistryId, stripeSubscriptionId, planTier }) {
  const db = getDb(deps);
  if (!db || typeof db.query !== 'function') {
    throw new Error('Database client not available');
  }
  const normalizedPlanTier = ensurePlanTier(planTier);
  const stripe = getStripeClient(deps);
  const subscription =
    stripeSubscriptionId && typeof stripeSubscriptionId === 'string'
      ? await stripe.subscriptions.retrieve(stripeSubscriptionId)
      : null;
  const stripeCustomerId = subscription?.customer ? String(subscription.customer) : null;
  const subscriptionStatus = subscription?.status ? String(subscription.status) : 'active';
  const enrolledResult = await db.query(
    `
      insert into enrolled_agents (agent_registry_id, plan_tier, stripe_subscription_id, stripe_customer_id, status)
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [agentRegistryId, normalizedPlanTier, stripeSubscriptionId, stripeCustomerId, subscriptionStatus]
  );
  const subscriptionResult = await db.query(
    `
      insert into stripe_subscriptions (agent_registry_id, stripe_customer_id, stripe_subscription_id, plan_tier, status)
      values ($1, $2, $3, $4, $5)
      on conflict (stripe_subscription_id)
      do update set
        agent_registry_id = excluded.agent_registry_id,
        stripe_customer_id = excluded.stripe_customer_id,
        plan_tier = excluded.plan_tier,
        status = excluded.status,
        updated_at = now()
      returning *
    `,
    [agentRegistryId, stripeCustomerId, stripeSubscriptionId, normalizedPlanTier, subscriptionStatus]
  );
  return {
    enrolledAgent: enrolledResult.rows[0],
    stripeSubscription: subscriptionResult.rows[0],
  };
}

export function validatePostmarkWebhookSignature(deps, secret, payload, sig) {
  if (typeof deps.validateWebhookSignature === 'function') {
    return deps.validateWebhookSignature(secret, payload, sig);
  }
  throw new Error('validateWebhookSignature is not available on deps');
}

export function validateTwilioWebhookSignature(deps, secret, payload, sig) {
  if (typeof deps.validateWebhookSignature === 'function') {
    return deps.validateWebhookSignature(secret, payload, sig);
  }
  throw new Error('validateWebhookSignature is not available on deps');
}

export async function processPartnerBilling(deps, { partnerId, planTier }) {
  const stripe = getStripeClient(deps);
  const price = getPriceId(planTier, true);
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: `${deps.baseUrl}/partner/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${deps.baseUrl}/partner/billing/cancel`,
    client_reference_id: String(partnerId),
    metadata: {
      partnerId: String(partnerId),
      planTier: ensurePlanTier(planTier),
    },
  });
}

export default {
  createCheckoutSession,
  enrollAgent,
  validatePostmarkWebhookSignature,
  validateTwilioWebhookSignature,
  processPartnerBilling,
};