import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS } from './tc-pricing.js'; // Assuming tc-pricing.js is in the same directory
import { createTCPricing } from './tc-pricing.js'; // Import to leverage existing pricing functions

let stripe = null;
let _pool = null;
let _logger = console;
let _tcPricingService = null; // To hold the initialized tc-pricing service

// Placeholder Stripe Price/Product IDs. In a production system, these would be configured
// in Stripe and their IDs stored in a configuration file or the database (e.g.,
// within PLAN_DETAILS or a dedicated Stripe Price mapping table).
// For this exercise, we define them here as examples.
// These IDs would typically be created once in Stripe and then referenced.
const STRIPE_PRICE_ID_FOUNDING_MONTHLY = 'price_1Pj123FoundingMonthly'; // Example Stripe Price ID for Founding Member monthly fee ($50/mo from tc-pricing.js)
const STRIPE_PRICE_ID_FOUNDING_SETUP = 'price_1Pj123FoundingSetup'; // Example Stripe Price ID for Founding Member one-time setup fee ($500 from tc-pricing.js)
const STRIPE_PRICE_ID_MONTHLY_STANDARD = 'price_1Pj123MonthlyStandard'; // Example Stripe Price ID for Standard Monthly fee ($149/mo from tc-pricing.js)
const STRIPE_PRODUCT_ID_PER_TRANSACTION = 'prod_1Pj123PerTransaction'; // Example Stripe Product ID for Pay-at-Closing one-off charges ($349/deal from tc-pricing.js)

// Helper to get agent client from DB
async function getAgentClientById(agentClientId) {
  const { rows } = await _pool.query(
    `SELECT * FROM tc_agent_clients WHERE id = $1`,
    [agentClientId]
  ).catch(() => ({ rows: [] }));
  return rows[0] || null;
}

/**
 * Initializes the Stripe billing service.
 * @param {object} deps - Dependencies object.
 * @param {object} deps.pool - PostgreSQL connection pool.
 * @param {object} [deps.logger=console] - Logger instance.
 */
export function createTCStripeBilling({ pool, logger = console }) {
  _pool = pool;
  _logger = logger;
  _tcPricingService = createTCPricing({ pool, logger }); // Initialize tc-pricing service

  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10', // Use a recent API version
    });
    _logger.info('[TC-STRIPE-BILLING] Stripe service initialized.');
  } else {
    _logger.warn('[TC-STRIPE-BILLING] STRIPE_SECRET_KEY not found. Stripe operations will be skipped.');
  }

  /**
   * Creates a Stripe customer for an agent client.
   * @param {object} agentClient - The agent client object from the database.
   * @returns {Promise<Stripe.Customer|null>} The created Stripe Customer object or null if Stripe is not configured.
   */
  async function createAgentStripeCustomer(agentClient) {
    if (!stripe) {
      _logger.warn('[TC-STRIPE-BILLING] Stripe secret key not configured. Skipping Stripe operation.');
      return null;
    }

    if (agentClient.stripe_customer_id) {
      _logger.info({ agentClientId: agentClient.id, stripeCustomerId: agentClient.stripe_customer_id }, '[TC-STRIPE-BILLING] Agent already has a Stripe customer ID. Attempting to retrieve.');
      try {
        const customer = await stripe.customers.retrieve(agentClient.stripe_customer_id);
        if (customer.deleted) {
          _logger.warn({ agentClientId: agentClient.id, stripeCustomerId: agentClient.stripe_customer_id }, '[TC-STRIPE-BILLING] Existing Stripe customer is deleted. Creating new one.');
        } else {
          return customer;
        }
      } catch (error) {
        _logger.error({ agentClientId: agentClient.id, error: error.message }, '[TC-STRIPE-BILLING] Failed to retrieve existing Stripe customer. Creating new one.');
        // Fall through to create a new customer if retrieval fails or customer is deleted
      }
    }

    try {
      const customer = await stripe.customers.create({
        email: agentClient.email,
        name: agentClient.name,
        metadata: {
          tc_agent_client_id: agentClient.id,
          tc_agent_client_plan: agentClient.plan,
        },
      });

      await _pool.query(
        `UPDATE tc_agent_clients SET stripe_customer_id = $1 WHERE id = $2 RETURNING *`,
        [customer.id, agentClient.id]
      );
      _logger.info({ agentClientId: agentClient.id, stripeCustomerId: customer.id }, '[TC-STRIPE-BILLING] Stripe customer created and linked.');
      return customer;
    } catch (error) {
      _logger.error({ agentClientId: agentClient.id, error: error.message }, '[TC-STRIPE-BILLING] Failed to create Stripe customer.');
      return null;
    }
  }

  /**
   * Creates a Stripe subscription for a monthly plan agent.
   * Handles one-time setup fees for Founding members.
   * @param {number} agentClientId - The ID of the agent client in the database.
   * @param {'founding_member' | 'monthly' | 'per_transaction'} planTier - The plan tier.
   * @returns {Promise<Stripe.Subscription|null>} The created Stripe Subscription object or null if Stripe is not configured or plan is per-transaction.
   */
  async function createTCSubscription(agentClientId, planTier) {
    if (!stripe) {
      _logger.warn('[TC-STRIPE-BILLING] Stripe secret key not configured. Skipping Stripe operation.');
      return null;
    }

    const agentClient = await getAgentClientById(agentClientId);
    if (!agentClient) {
      _logger.error({ agentClientId }, '[TC-STRIPE-BILLING] Agent client not found for subscription.');
      return null;
    }

    if (planTier === PLANS.PER_TRANSACTION) {
      _logger.info({ agentClientId, planTier }, '[TC-STRIPE-BILLING] Per-transaction plan does not require a Stripe subscription.');
      return null;
    }

    let stripeCustomer = null;
    if (!agentClient.stripe_customer_id) {
      stripeCustomer = await createAgentStripeCustomer(agentClient);
      if (!stripeCustomer) {
        _logger.error({ agentClientId }, '[TC-STRIPE-BILLING] Failed to create Stripe customer for subscription.');
        return null;
      }
    } else {
      try {
        stripeCustomer = await stripe.customers.retrieve(agentClient.stripe_customer_id);
        if (stripeCustomer.deleted) {
          _logger.warn({ agentClientId: agentClient.id, stripeCustomerId: agentClient.stripe_customer_id }, '[TC-STRIPE-BILLING] Existing Stripe customer is deleted. Creating new one.');
          stripeCustomer = await createAgentStripeCustomer(agentClient);
          if (!stripeCustomer) return null;
        }
      } catch (error) {
        _logger.error({ agentClientId: agentClient.id, error: error.message }, '[TC-STRIPE-BILLING] Failed to retrieve existing Stripe customer for subscription. Attempting to create new one.');
        stripeCustomer = await createAgentStripeCustomer(agentClient);
        if (!stripeCustomer) return null;
      }
    }

    if (agentClient.stripe_subscription_id) {
      _logger.info({ agentClientId, stripeSubscriptionId: agentClient.stripe_subscription_id }, '[TC-STRIPE-BILLING] Agent already has an active Stripe subscription. Attempting to retrieve.');
      try {
        const subscription = await stripe.subscriptions.retrieve(agentClient.stripe_subscription_id);
        if (subscription.status === 'active' || subscription