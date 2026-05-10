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
const STRIPE_PRICE_ID_FOUNDING_MONTHLY = 'price_1Pj123FoundingMonthly249'; // Example Stripe Price ID for Founding Member monthly fee ($249/mo)
const STRIPE_PRICE_ID_FOUNDING_SETUP = 'price_1Pj123FoundingSetup500'; // Example Stripe Price ID for Founding Member one-time setup fee ($500)
const STRIPE_PRICE_ID_MONTHLY_STANDARD = 'price_1Pj123MonthlyStandard149'; // Example Stripe Price ID for Standard Monthly fee ($149/mo)
const STRIPE_PRODUCT_ID_PER_TRANSACTION = 'prod_1Pj123PerTransaction349'; // Example Stripe Product ID for Pay-at-Closing one-off charges ($349/deal)

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
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          _logger.info({ agentClientId, stripeSubscriptionId: subscription.id }, '[TC-STRIPE-BILLING] Existing active subscription found. Returning it.');
          return subscription;
        } else {
          _logger.warn({ agentClientId, stripeSubscriptionId: subscription.id, status: subscription.status }, '[TC-STRIPE-BILLING] Existing subscription is not active. Creating a new one.');
          // Optionally cancel the old one here if it's not active but not cancelled
          await stripe.subscriptions.cancel(subscription.id);
        }
      } catch (error) {
        _logger.error({ agentClientId, stripeSubscriptionId: agentClient.stripe_subscription_id, error: error.message }, '[TC-STRIPE-BILLING] Failed to retrieve existing Stripe subscription. Creating a new one.');
      }
    }

    let priceId;
    const items = [];
    const planInfo = PLAN_DETAILS[planTier];

    if (!planInfo) {
      _logger.error({ agentClientId, planTier }, '[TC-STRIPE-BILLING] Unknown plan tier for subscription creation.');
      return null;
    }

    switch (planTier) {
      case PLANS.FOUNDING:
        priceId = STRIPE_PRICE_ID_FOUNDING_MONTHLY;
        items.push({ price: priceId });
        break;
      case PLANS.MONTHLY:
        priceId = STRIPE_PRICE_ID_MONTHLY_STANDARD;
        items.push({ price: priceId });
        break;
      default:
        _logger.error({ agentClientId, planTier }, '[TC-STRIPE-BILLING] Invalid plan tier for subscription creation.');
        return null;
    }

    try {
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: items,
        collection_method: 'charge_automatically', // Or 'send_invoice' if Adam wants to review
        metadata: {
          tc_agent_client_id: agentClient.id,
          tc_agent_client_plan: planTier,
        },
      });

      // Handle one-time setup fee for Founding members if not already paid
      if (planTier === PLANS.FOUNDING && planInfo.setup_fee > 0 && !agentClient.setup_paid) {
        _logger.info({ agentClientId, setupFee: planInfo.setup_fee }, '[TC-STRIPE-BILLING] Creating one-time setup fee invoice item for Founding Member.');
        const setupInvoiceItem = await stripe.invoiceItems.create({
          customer: stripeCustomer.id,
          price: STRIPE_PRICE_ID_FOUNDING_SETUP, // Use a specific price for the setup fee
          quantity: 1,
          description: `${planInfo.label} Setup Fee`,
          metadata: {
            tc_agent_client_id: agentClient.id,
            tc_agent_client_plan: planTier,
            fee_type: 'setup_fee',
          },
        });

        // Immediately finalize the invoice for the setup fee
        const invoice = await stripe.invoices.create({
          customer: stripeCustomer.id,
          collection_method: 'charge_automatically',
          auto_advance: true, // Automatically attempt to collect payment
          metadata: {
            tc_agent_client_id: agentClient.id,
            tc_agent_client_plan: planTier,
            invoice_type: 'setup_fee',
          },
        });

        // Finalize the invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        _logger.info({ agentClientId, invoiceId: finalizedInvoice.id, status: finalizedInvoice.status }, '[TC-STRIPE-BILLING] Setup fee invoice created and finalized.');

        // Mark setup fee as paid in local DB
        await _tcPricingService.markSetupPaid(agentClientId, { amountPaid: planInfo.setup_fee });
      }

      await _pool.query(
        `UPDATE tc_agent_clients SET stripe_subscription_id = $1, stripe_customer_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [subscription.id, stripeCustomer.id, agentClientId]
      );
      _logger.info({ agentClientId, stripeSubscriptionId: subscription.id, status: subscription.status }, '[TC-STRIPE-BILLING] Stripe subscription created and linked.');

      return subscription;
    } catch (error) {
      _logger.error({ agentClientId, planTier, error: error.message }, '[TC-STRIPE-BILLING] Failed to create Stripe subscription.');
      return null;
    }
  }

  /**
   * Records a closing charge for a per-transaction agent.
   * This creates a one-off invoice item and an invoice in Stripe.
   * @param {number} agentClientId - The ID of the agent client in the database.
   * @param {number} transactionId - The ID of the transaction in the database.
   * @param {number} amountCents - The amount to charge in cents.
   * @returns {Promise<Stripe.Invoice|null>} The created Stripe Invoice object or null if Stripe is not configured.
   */
  async function recordClosingCharge(agentClientId, transactionId, amountCents) {
    if (!stripe) {
      _logger.warn('[TC-STRIPE-BILLING] Stripe secret key not configured. Skipping Stripe operation.');
      return null;
    }

    const agentClient = await getAgentClientById(agentClientId);
    if (!agentClient) {
      _logger.error({ agentClientId }, '[TC-STRIPE-BILLING] Agent client not found for closing charge.');
      return null;
    }

    if (agentClient.plan !== PLANS.PER_TRANSACTION) {
      _logger.warn({ agentClientId, plan: agentClient.plan }, '[TC-STRIPE-BILLING] Closing charge requested for non-per-transaction plan. This should be handled by subscription or is an override.');
      // Still proceed to record if explicitly called, but log a warning.
    }

    let stripeCustomer = null;
    if (!agentClient.stripe_customer_id) {
      stripeCustomer = await createAgentStripeCustomer(agentClient);
      if (!stripeCustomer) {
        _logger.error({ agentClientId }, '[TC-STRIPE-BILLING] Failed to create Stripe customer for closing charge.');
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
        _logger.error({ agentClientId: agentClient.id, error: error.message }, '[TC-STRIPE-BILLING] Failed to retrieve existing Stripe customer for closing charge. Attempting to create new one.');
        stripeCustomer = await createAgentStripeCustomer(agentClient);
        if (!stripeCustomer) return null;
      }
    }

    try {
      // Create an invoice item for the closing fee
      await stripe.invoiceItems.create({
        customer: stripeCustomer.id,
        amount: amountCents,
        currency: 'usd',
        description: `TC Closing Fee for Transaction ID: ${transactionId}`,
        metadata: {
          tc_agent_client_id: agentClientId,
          tc_transaction_id: transactionId,
          fee_type: 'closing_fee',
        },
        // Optionally link to a product if one exists for per-transaction fees
        // price: STRIPE_PRODUCT_ID_PER_TRANSACTION, // If using a Price object for one-off charges
      });

      // Create and finalize an invoice for the customer
      const invoice = await stripe.invoices.create({
        customer: stripeCustomer.id,
        collection_method: 'charge_automatically', // Or 'send_invoice' if Adam wants to review
        auto_advance: true, // Automatically attempt to collect payment
        metadata: {
          tc_agent_client_id: agentClientId,
          tc_transaction_id: transactionId,
          invoice_type: 'closing_fee',
        },
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      _logger.info({ agentClientId, transactionId, invoiceId: finalized