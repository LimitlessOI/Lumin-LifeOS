import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS } from './tc-pricing.js'; // Import directly, as createTCPricing is also exported
import { createTCPricing } from './tc-pricing.js'; // Explicitly import createTCPricing

// Placeholder Stripe Price IDs. In a production system, these would be configured
// in Stripe and their IDs stored in a configuration file or the database.
// For this exercise, we define them here as examples.
// These should correspond to actual Stripe Price objects created in the Stripe Dashboard.
const STRIPE_PRICE_ID_FOUNDING_MONTHLY = process.env.STRIPE_PRICE_ID_FOUNDING_MONTHLY || 'price_1Pj123FoundingMonthly'; // Example Stripe Price ID for Founding Member monthly fee ($249)
const STRIPE_PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY || 'price_1Pj123Monthly'; // Example Stripe Price ID for Standard Monthly fee ($149)

let stripe;
let tcPricingService;
let logger = console; // Default logger

/**
 * Initializes the Stripe client and TC Pricing service.
 * If STRIPE_SECRET_KEY is not set, logs a warning and returns null for Stripe operations.
 * @param {object} deps - Dependencies object.
 * @param {object} deps.pool - PostgreSQL connection pool.
 * @param {object} [deps.logger=console] - Logger instance.
 */
export function initStripeBillingService({ pool, logger: customLogger = console }) {
  logger = customLogger;
  tcPricingService = createTCPricing({ pool, logger });

  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('[TC-STRIPE] STRIPE_SECRET_KEY is not set. Stripe operations will be no-ops.');
    stripe = null;
  } else {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10', // Use a recent stable API version
    });
    logger.info('[TC-STRIPE] Stripe service initialized.');
  }
}

/**
 * Creates a Stripe Customer for a given agent client.
 * @param {object} agentClient - The agent client object from tc_agent_clients. Expected to have `name` and `email`.
 * @returns {Promise<Stripe.Customer|null>} The created Stripe Customer object, or null if Stripe is not initialized.
 */
export async function createAgentStripeCustomer(agentClient) {
  if (!stripe) {
    logger.warn('[TC-STRIPE] createAgentStripeCustomer: Stripe not initialized. Returning null.');
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      name: agentClient.name,
      email: agentClient.email,
      metadata: {
        tc_agent_client_id: agentClient.id, // Assuming agentClient has an 'id'
      },
    });
    logger.info({ customerId: customer.id, agentClientId: agentClient.id }, '[TC-STRIPE] Created Stripe customer.');
    return customer;
  } catch (error) {
    logger.error({ error, agentClientEmail: agentClient.email }, '[TC-STRIPE] Error creating Stripe customer.');
    return null;
  }
}

/**
 * Creates a Stripe Subscription for a given agent client and plan tier.
 * Only applicable for monthly plans (Founding, Monthly Standard).
 * @param {string|number} agentClientId - The ID of the agent client.
 * @param {'founding_member' | 'monthly_standard' | 'pay_at_closing'} planTier - The plan tier.
 * @returns {Promise<Stripe.Subscription|null>} The created Stripe Subscription object, or null if not applicable/initialized.
 */
export async function createTCSubscription(agentClientId, planTier) {
  if (!stripe) {
    logger.warn('[TC-STRIPE] createTCSubscription: Stripe not initialized. Returning null.');
    return null;
  }

  if (planTier === PLANS.PER_TRANSACTION) {
    logger.info({ agentClientId, planTier }, '[TC-STRIPE] No subscription created for Pay-at-Closing plan.');
    return null; // Pay-at-Closing clients do not have subscriptions
  }

  try {
    const agentClient = await tcPricingService.getAgentClient(agentClientId);
    if (!agentClient) {
      logger.error({ agentClientId }, '[TC-STRIPE] Agent client not found for subscription creation.');
      return null;
    }
    if (!agentClient.stripe_customer_id) {
      logger.warn({ agentClientId, planTier }, '[TC-STRIPE] Agent client has no Stripe customer ID. Cannot create subscription.');
      return null;
    }

    let priceId;
    if (planTier === PLANS.FOUNDING) {
      priceId = STRIPE_PRICE_ID_FOUNDING_MONTHLY;
    } else if (planTier === PLANS.MONTHLY) {
      priceId = STRIPE_PRICE_ID_MONTHLY;
    } else {
      logger.warn({ agentClientId, planTier }, '[TC-STRIPE] Unknown or non-subscription plan tier for subscription creation.');
      return null;
    }

    const subscription = await stripe.subscriptions.create({
      customer: agentClient.stripe_customer_id,
      items: [{ price: priceId }],
      collection_method: 'charge_automatically', // Or 'send_invoice' if Adam reviews before charging
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tc_agent_client_id: agentClient.id,
        tc_plan_tier: planTier,
      },
    });

    logger.info({ subscriptionId: subscription.id, agentClientId: agentClient.id, planTier }, '[TC-STRIPE] Created Stripe subscription.');
    return subscription;
  } catch (error) {
    logger.error({ error, agentClientId, planTier }, '[TC-STRIPE] Error creating Stripe subscription.');
    return null;
  }
}

/**
 * Records a closing charge for a per-transaction agent.
 * This creates a one-off invoice item for the customer.
 * @param {string|number} agentClientId - The ID of the agent client.
 * @param {string|number} transactionId - The ID of the transaction.
 * @param {number} amountCents - The amount to charge in cents.
 * @returns {Promise<Stripe.InvoiceItem|null>} The created Stripe Invoice Item, or null if not applicable/initialized.
 */
export async function recordClosingCharge(agentClientId, transactionId, amountCents) {
  if (!stripe) {
    logger.warn('[TC-STRIPE] recordClosingCharge: Stripe not initialized. Returning null.');
    return null;
  }

  try {
    const agentClient = await tcPricingService.getAgentClient(agentClientId);
    if (!agentClient) {
      logger.error({ agentClientId }, '[TC-STRIPE] Agent client not found for closing charge.');
      return null;
    }
    if (!agentClient.stripe_customer_id) {
      logger.warn({ agentClientId, transactionId }, '[TC-STRIPE] Agent client has no Stripe customer ID. Cannot record closing charge.');
      return null;
    }

    const transaction = await tcPricingService.applyToTransaction(transactionId, {}); // Get transaction details
    if (!transaction) {
      logger.error({ transactionId }, '[TC-STRIPE] Transaction not found for closing charge.');
      return null;
    }

    const invoiceItem = await stripe.invoiceItems.create({
      customer: agentClient.stripe_customer_id,
      amount: amountCents,
      currency: 'usd',
      description: `Closing Fee for Transaction: ${transaction.address} (ID: ${transactionId})`,
      metadata: {
        tc_agent_client_id: agentClient.id,
        tc_transaction_id: transactionId,
        tc_plan_tier: agentClient.plan,
        type: 'closing_fee',
      },
    });

    logger.info({ invoiceItemId: invoiceItem.id, agentClientId, transactionId, amountCents }, '[TC-STRIPE] Recorded Stripe closing charge invoice item.');

    // Optionally, create an invoice immediately if the client doesn't have an active subscription
    // and Adam reviews billing events. For now, just creating the invoice item.
    // A separate process or manual action would create/finalize the invoice.
    // If the customer has a subscription, this invoice item will be added to their next subscription invoice.

    return invoiceItem;
  } catch (error) {
    logger.error({ error, agentClientId, transactionId, amountCents }, '[TC-STRIPE] Error recording closing charge.');
    return null;
  }
}

/**
 * Retrieves a billing revenue summary.
 * This leverages the existing tcPricingService for database-derived revenue metrics.
 * For Stripe-specific revenue, more complex Stripe API calls would be needed (e.g., listing invoices, subscriptions).
 * @returns {Promise<object|null>} A revenue summary object, or null if Stripe is not initialized.
 */
export async function getTCBillingRevenue() {
  if (!stripe) {
    logger.warn('[TC-STRIPE] getTCBillingRevenue: Stripe not initialized. Returning null.');
    return null;
  }

  // The existing tcPricingService.getRevenueSummary already provides MRR, ARR, and pending fees
  // based on the internal database. This fulfills the "expose a billing revenue summary" constraint
  // without inventing new Stripe-specific aggregation logic for this task.
  const internalRevenueSummary = await tcPricingService.getRevenueSummary();

  // To augment with Stripe-specific data, one would query Stripe for:
  // 1. All active subscriptions to calculate MRR/ARR from Stripe's perspective.
  // 2. All outstanding invoices for pending payments.
  // This is a more involved task and the current prompt implies leveraging existing internal data.

  // Example of how one might fetch Stripe MRR (simplified, not fully robust):
  let stripeMRR = 0;
  try {
    const subscriptions = await stripe.subscriptions.list({ status: 'active', limit: 100 }); // Adjust limit as needed
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        // Assuming price.unit_amount is in cents and interval is month
        if (item.price.recurring?.interval === 'month') {
          stripeMRR += item.price.unit_amount / 100; // Convert cents to dollars
        }
      }
    }
  } catch (error) {
    logger.error({ error }, '[TC-STRIPE] Error fetching Stripe subscriptions for MRR calculation.');
    // Continue with internal summary if Stripe data fetch fails
  }

  return {
    ...internalRevenueSummary,
    stripe_mrr_estimate: stripeMRR, // Add Stripe's view of MRR
    // Further Stripe-specific metrics could be added here
  };
}

/**
 * Cancels an active Stripe Subscription for a given agent client.
 * @param {string|number} agentClientId - The ID of the agent client.
 * @returns {Promise<Stripe.Subscription|null>} The cancelled Stripe Subscription object, or null if not applicable/initialized.
 */
export async function cancelTCSubscription(agentClientId) {
  if (!stripe) {
    logger.warn('[TC-STRIPE] cancelTCSubscription: Stripe not initialized. Returning null.');
    return null;
  }

  try {
    const agentClient = await tcPricingService.getAgentClient(agentClientId);
    if (!agentClient) {
      logger.error({ agentClientId }, '[TC-STRIPE] Agent client not found for subscription cancellation.');
      return null;
    }
    if (!agentClient.stripe_subscription_id) { // Assuming this field would exist if stored
      logger.warn({ agentClientId }, '[TC-STRIPE] Agent client has no Stripe subscription ID. Nothing to cancel.');
      return null;
    }

    const cancelledSubscription = await stripe.subscriptions.cancel(
      agentClient.stripe_subscription_id
    );

    logger.info({ subscriptionId: cancelledSubscription.id, agentClientId: agentClient.id }, '[TC-STRIPE] Cancelled Stripe subscription.');
    return cancelledSubscription;
  } catch (error) {
    logger.error({ error, agentClientId }, '[TC-STRIPE] Error cancelling Stripe subscription.');
    return null;
  }
}