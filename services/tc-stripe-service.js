import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS } from './tc-pricing.js'; // Assuming tc-pricing.js is in the same directory

// Initialize Stripe client
let stripe;
function getStripeClient(logger) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('[TC-BILLING-STRIPE] STRIPE_SECRET_KEY is not set. Stripe operations will be no-ops.');
    return null;
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10', // Use a recent API version
    });
  }
  return stripe;
}

// Placeholder Stripe Price IDs. In a real system, these would be configured or fetched from Stripe.
// ASSUMPTION: These Stripe Price IDs are pre-configured in the Stripe dashboard.
// The actual values would be obtained from Stripe after creating Products and Prices.
const STRIPE_PRICE_IDS = {
  [PLANS.FOUNDING]: 'price_1O2xYw2eZvKYlo2Cg12345FM', // Example Price ID for Founding Member monthly fee
  [PLANS.MONTHLY]: 'price_1O2xYw2eZvKYlo2Cg12345MS',  // Example Price ID for Monthly Standard monthly fee
  // PER_TRANSACTION does not have a recurring subscription price
};

// Helper to query the database, assuming `pool.query` is available via `pq` macro
const asyncFn = (fn) => fn; // Placeholder for async function wrapper if needed
const pq = (pool, query, params) => pool.query(query, params);

export function createTCBillingService({ pool, logger = console }) {
  const stripeClient = getStripeClient(logger);

  // Helper to get agent client details from the database
  async function getAgentClient(idOrEmail) {
    const byEmail = typeof idOrEmail === 'string' && idOrEmail.includes('@');
    const { rows } = await pq(pool,
      `SELECT * FROM tc_agent_clients WHERE ${byEmail ? 'email=$1' : 'id=$1'}`,
      [idOrEmail]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  /**
   * Creates a Stripe Customer for an agent client.
   * If the client already has a Stripe Customer ID, it returns the existing one.
   * Handles one-time setup fees for Founding members by creating a Stripe Invoice.
   * @param {object} agentClient - The agent client object from tc_agent_clients table.
   * @returns {Promise<Stripe.Customer|null>} The Stripe Customer object or null if Stripe is not configured.
   */
  async function createAgentStripeCustomer(agentClient) {
    if (!stripeClient) return null;

    let client = agentClient;
    if (!client.id && client.email) { // If only email is provided, fetch full client object
      client = await getAgentClient(client.email);
      if (!client) {
        logger.error({ email: agentClient.email }, '[TC-BILLING-STRIPE] Agent client not found for Stripe customer creation.');
        return null;
      }
    }

    if (client.stripe_customer_id) {
      logger.info({ customerId: client.stripe_customer_id }, '[TC-BILLING-STRIPE] Agent already has Stripe customer ID.');
      return stripeClient.customers.retrieve(client.stripe_customer_id);
    }

    try {
      const customer = await stripeClient.customers.create({
        email: client.email,
        name: client.name,
        metadata: {
          tc_agent_client_id: client.id,
          plan: client.plan,
        },
      });

      await pq(pool,
        `UPDATE tc_agent_clients SET stripe_customer_id=$1 WHERE id=$2 ret`,
        [customer.id, client.id]
      );
      logger.info({ customerId: customer.id, agentId: client.id }, '[TC-BILLING-STRIPE] Stripe customer created and linked.');

      // Handle one-time setup fee for Founding members
      const planInfo = PLAN_DETAILS[client.plan];
      if (client.plan === PLANS.FOUNDING && planInfo.setup_fee > 0 && !client.setup_paid) {
        logger.info({ agentId: client.id, setupFee: planInfo.setup_fee }, '[TC-BILLING-STRIPE] Creating setup fee invoice for Founding Member.');
        const setupFeeCents = planInfo.setup_fee * 100;
        await stripeClient.invoiceItems.create({
          customer: customer.id,
          amount: setupFeeCents,
          currency: 'usd',
          description: `${planInfo.label} Setup Fee`,
          metadata: {
            tc_agent_client_id: client.id,
            fee_type: 'setup_fee',
          },
        });
        // Note: The invoice is created but not finalized/sent automatically,
        // aligning with "Adam reviews all billing events".
        logger.info({ customerId: customer.id, amount: setupFeeCents }, '[TC-BILLING-STRIPE] Setup fee invoice item created.');
      }

      return customer;
    } catch (error) {
      logger.error({ error: error.message, agentId: client.id }, '[TC-BILLING-STRIPE] Failed to create Stripe customer.');
      return null;
    }
  }

  /**
   * Creates a Stripe Subscription for an agent client based on their plan tier.
   * @param {number} agentClientId - The ID of the agent client in tc_agent_clients.
   * @param {'founding_member' | 'monthly_standard' | 'pay_at_closing'} planTier - The plan tier.
   * @returns {Promise<Stripe.Subscription|null>} The Stripe Subscription object or null if Stripe is not configured or plan is per-transaction.
   */
  async function createTCSubscription(agentClientId, planTier) {
    if (!stripeClient) return null;

    const client = await getAgentClient(agentClientId);
    if (!client) {
      logger.error({ agentClientId }, '[TC-BILLING-STRIPE] Agent client not found for subscription creation.');
      return null;
    }

    if (planTier === PLANS.PER_TRANSACTION) {
      logger.warn({ agentClientId, planTier }, '[TC-BILLING-STRIPE] Per-transaction plan does not have a recurring Stripe subscription.');
      return null;
    }

    if (!client.stripe_customer_id) {
      logger.info({ agentClientId }, '[TC-BILLING-STRIPE] Creating Stripe customer before subscription.');
      const customer = await createAgentStripeCustomer(client);
      if (!customer) return null;
      client.stripe_customer_id = customer.id;
    }

    if (client.stripe_subscription_id) {
      logger.info({ subscriptionId: client.stripe_subscription_id }, '[TC-BILLING-STRIPE] Agent already has an active Stripe subscription.');
      return stripeClient.subscriptions.retrieve(client.stripe_subscription_id);
    }

    const priceId = STRIPE_PRICE_IDS[planTier];
    if (!priceId) {
      logger.error({ planTier }, '[TC-BILLING-STRIPE] No Stripe Price ID configured for this plan tier.');
      return null;
    }

    try {
      const subscription = await stripeClient.subscriptions.create({
        customer: client.stripe_customer_id,
        items: [{ price: priceId }],
        collection_method: 'charge_automatically', // Or 'send_invoice' if Adam wants to manually send
        metadata: {
          tc_agent_client_id: client.id,
          plan: planTier,
        },
      });

      await pq(pool,
        `UPDATE tc_agent_clients SET stripe_subscription_id=$1 WHERE id=$2 ret`,
        [subscription.id, client.id]
      );
      logger.info({ subscriptionId: subscription.id, agentId: client.id, planTier }, '[TC-BILLING-STRIPE] Stripe subscription created and linked.');
      return subscription;
    } catch (error) {
      logger.error({ error: error.message, agentId: client.id, planTier }, '[TC-BILLING-STRIPE] Failed to create Stripe subscription.');
      return null;
    }
  }

  /**
   * Records a closing charge for a per-transaction agent.
   * This creates a one-time invoice item in Stripe for review.
   * @param {number} agentClientId - The ID of the agent client.
   * @param {number} transactionId - The ID of the transaction.
   * @param {number} amountCents - The amount to charge in cents.
   * @returns {Promise<Stripe.InvoiceItem|null>} The Stripe Invoice Item object or null.
   */
  async function recordClosingCharge(agentClientId, transactionId, amountCents) {
    if (!stripeClient) return null;

    const client = await getAgentClient(agentClientId);
    if (!client) {
      logger.error({ agentClientId }, '[TC-BILLING-STRIPE] Agent client not found for closing charge.');
      return null;
    }

    if (!client.stripe_customer_id) {
      logger.info({ agentClientId }, '[TC-BILLING-STRIPE] Creating Stripe customer before recording closing charge.');
      const customer = await createAgentStripeCustomer(client);
      if (!customer) return null;
      client.stripe_customer_id = customer.id;
    }

    try {
      const transaction = (await pq(pool, `SELECT address FROM tc_transactions WHERE id=$1`, [transactionId])).rows[0];
      const description = `Closing Fee for Transaction: ${transaction?.address || transactionId}`;

      const invoiceItem = await stripeClient.invoiceItems.create({
        customer: client.stripe_customer_id,
        amount: amountCents,
        currency: 'usd',
        description: description,
        metadata: {
          tc_agent_client_id: client.id,
          tc_transaction_id: transactionId,
          fee_type: 'closing_fee',
          plan: client.plan,
        },
      });
      logger.info({ invoiceItemId: invoiceItem.id, agentId: client.id, transactionId, amountCents }, '[TC-BILLING-STRIPE] Closing charge invoice item created.');
      // Note: Invoice item is created, but not finalized/sent, aligning with "Adam reviews all billing events".
      return invoiceItem;
    } catch (error) {
      logger.error({ error: error.message, agentId: client.id, transactionId }, '[TC-BILLING-STRIPE] Failed to record closing charge.');
      return null;
    }
  }

  /**
   * Retrieves a summary of TC billing revenue.
   * Combines local DB revenue summary with Stripe subscription data.
   * @returns {Promise<object|null>} An object containing MRR, ARR, setup fees, closing fees, and Stripe subscription counts.
   */
  async function getTCBillingRevenue() {
    const pricingService = createTCPricing({ pool, logger });
    const localRevenue = await pricingService.getRevenueSummary();

    if (!stripeClient) {
      logger.warn('[TC-BILLING-STRIPE] Stripe not configured. Returning local revenue summary only.');
      return { ...localRevenue, stripe_active_subscriptions: 0 };
    }

    try {
      const subscriptions = await stripeClient.subscriptions.list({
        status: 'active',
        limit: 100, // Adjust limit as needed, or paginate for larger datasets
      });

      const activeStripeSubscriptions = subscriptions.data.length;

      return {
        ...localRevenue,
        stripe_active_subscriptions: activeStripeSubscriptions,
        // Further Stripe-specific metrics could be added here, e.g., from Stripe Balance or Reports
      };
    } catch (error) {
      logger.error({ error: error.message }, '[TC-BILLING-STRIPE] Failed to retrieve Stripe billing revenue.');
      return { ...localRevenue, stripe_active_subscriptions: 0, stripe_error: error.message };
    }
  }

  /**
   * Cancels an agent's Stripe subscription.
   * @param {number} agentClientId - The ID of the agent client.
   * @returns {Promise<Stripe.Subscription|null>} The canceled Stripe Subscription object or null.
   */
  async function cancelTCSubscription(agentClientId) {
    if (!stripeClient) return null;

    const client = await getAgentClient(agentClientId);
    if (!client) {
      logger.error({ agentClientId }, '[TC-BILLING-STRIPE] Agent client not found for subscription cancellation.');
      return null;
    }

    if (!client.stripe_subscription_id) {
      logger.warn({ agentClientId }, '[TC-BILLING-STRIPE] Agent client does not have an active Stripe subscription to cancel.');
      return null;
    }

    try {
      const canceledSubscription = await stripeClient.subscriptions.cancel(
        client.stripe_subscription_id
      );

      await pq(pool,
        `UPDATE tc_agent_clients SET stripe_subscription_id=NULL WHERE id=$1 ret`,
        [client.id]