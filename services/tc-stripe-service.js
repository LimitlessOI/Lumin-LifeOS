// services/tc-stripe-service.js
import { getStripeClient } from './tc-stripe-service.js';
import { PLANS, PLAN_DETAILS } from './tc-pricing.js';
import { Pool } from 'pg';
import { logger } from '../logger';

const STRIPE_PRICE_IDS = {
  founding_member: 'price_123456789',
  monthly: 'price_987654321',
  per_transaction: 'price_111111111',
};

async function createSubscription(pool, agentId, planKey, logger) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('Stripe secret key not set, skipping subscription creation');
    return null;
  }

  const stripeClient = await getStripeClient();
  const customer = await stripeClient.customers.create({
    email: `agent${agentId}@example.com`,
  });
  const subscription = await stripeClient.subscriptions.create({
    customer: customer.id,
    items: [{ plan: STRIPE_PRICE_IDS[planKey] }],
  });

  const dbPool = new Pool(pool);
  await dbPool.query(
    `UPDATE tc_agent_clients SET status = 'active', stripe_customer_id = $1 WHERE id = $2`,
    [customer.id, agentId]
  );
  await dbPool.query(
    `INSERT INTO tc_agent_clients (id, stripe_subscription_id) VALUES ($1, $2)`,
    [agentId, subscription.id]
  );
  return subscription;
}

async function recordClosingFee(pool, transactionId, agentId, logger) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('Stripe secret key not set, skipping closing fee recording');
    return null;
  }

  const stripeClient = await getStripeClient();
  const paymentIntent = await stripeClient.paymentIntents.create({
    amount: 34900,
    currency: 'usd',
    payment_method_types: ['card'],
  });
  await stripeClient.paymentIntents.confirm(paymentIntent.id, {
    payment_method: 'pm_card_visa',
  });

  const dbPool = new Pool(pool);
  await dbPool.query(
    `UPDATE tc_transactions SET closing_fee_status = 'paid' WHERE id = $1`,
    [transactionId]
  );
  await dbPool.query(
    `INSERT INTO tc_transactions (id, closing_fee_status, closing_fee_amount) VALUES ($1, 'paid', 34900)`,
    [transactionId]
  );
  return paymentIntent;
}

async function cancelSubscription(pool, agentId, logger) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('Stripe secret key not set, skipping subscription cancellation');
    return null;
  }

  const stripeClient = await getStripeClient();
  const subscription = await stripeClient.subscriptions.retrieve(
    (await dbPool.query(
      `SELECT stripe_subscription_id FROM tc_agent_clients WHERE id = $1`,
      [agentId]
    )).rows[0].stripe_subscription_id
  );
  await stripeClient.subscriptions.del(subscription.id);

  const dbPool = new Pool(pool);
  await dbPool.query(
    `UPDATE tc_agent_clients SET status = 'cancelled' WHERE id = $1`,
    [agentId]
  );
  return subscription;
}

export { createSubscription, recordClosingFee, cancelSubscription };