import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS } from './tc-pricing.js';
import { createTCPricing } from './tc-pricing.js';

let stripe = null;
let _pool = null;
let _logger = console;
let _tcPricingService = null;

// Placeholder Stripe Price/Product IDs. In a production system, these would be configured
// in Stripe and their IDs stored in a configuration file or the database.
// For this exercise, we define them here as examples, reflecting the task's specified pricing.
const STRIPE_PRICE_MAP = {
    [PLANS.FOUNDING]: {
        monthly_price_id: 'price_FOUNDING_MONTHLY_249', // $249/mo
        setup_price_id: 'price_FOUNDING_SETUP_500',     // $500 one-time
    },
    [PLANS.MONTHLY]: {
        monthly_price_id: 'price_MONTHLY_STANDARD_149', // $149/mo
    },
    [PLANS.PER_TRANSACTION]: {
        // For per-transaction, we create one-off invoice items, so a product ID is more relevant
        closing_fee_product_id: 'prod_PER_TRANSACTION_349', // $349 per closed deal
    }
};

/**
 * Initializes the Stripe billing service.
 * @param {object} deps - Dependencies including pool and logger.
 * @returns {object} An object containing the Stripe billing functions.
 */
export function createTCStripeBilling({ pool, logger = console }) {
    _pool = pool;
    _logger = logger;
    _tcPricingService = createTCPricing({ pool, logger });

    if (!process.env.STRIPE_SECRET_KEY) {
        _logger.warn('[TC-STRIPE] STRIPE_SECRET_KEY environment variable is not set. Stripe billing functions will operate as no-ops.');
        stripe = null;
    } else {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-04-10', // Use a recent stable API version
        });
    }

    /**
     * Creates a Stripe Customer for an agent client.
     * @param {object} agentClient - The agent client object from tc_agent_clients. Must have 'id', 'email', 'name', 'plan', 'stripe_customer_id' (optional).
     * @returns {object|null} The Stripe Customer object or null if no-op or failure.
     */
    async function createAgentStripeCustomer(agentClient) {
        if (!stripe) {
            _logger.warn('[TC-STRIPE] Stripe not initialized. Skipping createAgentStripeCustomer for %s.', agentClient.email);
            return null;
        }
        if (agentClient.stripe_customer_id) {
            _logger.info('[TC-STRIPE] Agent %s already has Stripe customer ID %s. Attempting to retrieve.', agentClient.email, agentClient.stripe_customer_id);
            try {
                const customer = await stripe.customers.retrieve(agentClient.stripe_customer_id);
                if (customer && !customer.deleted) {
                    return customer;
                } else {
                    _logger.warn('[TC-STRIPE] Existing Stripe customer %s for %s is deleted or invalid. Creating new one.', agentClient.stripe_customer_id, agentClient.email);
                }
            } catch (error) {
                _logger.error({ error, agentClientEmail: agentClient.email }, '[TC-STRIPE] Failed to retrieve existing Stripe customer. Creating new one.');
                // Fall through to create a new customer if retrieval fails
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
            _logger.info({ customerId: customer.id, agentClientEmail: agentClient.email }, '[TC-STRIPE] Created Stripe customer.');
            return customer;
        } catch (error) {
            _logger.error({ error, agentClientEmail: agentClient.email }, '[TC-STRIPE] Failed to create Stripe customer.');
            return null;
        }
    }

    /**
     * Creates a Stripe Subscription for a monthly plan agent.
     * Handles setup fees for Founding Members.
     * @param {number} agentClientId - The ID of the agent client.
     * @param {'founding_member' | 'monthly_standard' | 'pay_at_closing'} planTier - The plan tier.
     * @returns {object|null} The Stripe Subscription object or null if no-op or failure.
     */
    async function createTCSubscription(agentClientId, planTier) {
        if (!stripe) {
            _logger.warn('[TC-STRIPE] Stripe not initialized. Skipping createTCSubscription for client %s.', agentClientId);
            return null;
        }

        const agentClient = await _tcPricingService.getAgentClient(agentClientId);
        if (!agentClient) {
            _logger.error('[TC-STRIPE] Agent client %s not found for subscription.', agentClientId);
            return null;
        }

        if (planTier === PLANS.PER_TRANSACTION) {
            _logger.info('[TC-STRIPE] Pay-at-Closing plan does not require a Stripe subscription. Skipping for client %s.', agentClientId);
            return null;
        }

        let customer = null;
        if (!agentClient.stripe_customer_id) {
            customer = await createAgentStripeCustomer(agentClient);
            if (!customer) return null; // Failed to create customer
        } else {
            try {
                customer = await stripe.customers.retrieve(agentClient.stripe_customer_id);
                if (!customer || customer.deleted) {
                    _logger.warn('[TC-STRIPE] Existing Stripe customer %s for %s is deleted or invalid. Attempting to create new one.', agentClient.stripe_customer_id, agentClient.email);
                    customer = await createAgentStripeCustomer(agentClient);
                    if (!customer) return null;
                }
            } catch (error) {
                _logger.error({ error, agentClientId }, '[TC-STRIPE] Failed to retrieve Stripe customer %s. Attempting to create new one.', agentClient.stripe_customer_id);
                customer = await createAgentStripeCustomer(agentClient);
                if (!customer) return null;
            }
        }

        if (agentClient.stripe_subscription_id) {
            _logger.info('[TC-STRIPE] Agent %s already has Stripe subscription ID %s. Attempting to retrieve existing subscription.', agentClient.email, agentClient.stripe_subscription_id);
            try {
                const subscription = await stripe.subscriptions.retrieve(agentClient.stripe_subscription_id);
                if (subscription && subscription.status !== 'canceled' && subscription.status !== 'unpaid') {
                    return subscription;
                } else {
                    _logger.warn('[TC-STRIPE] Existing Stripe subscription %s for %s is canceled or invalid. Creating new one.', agentClient.stripe_subscription_id, agentClient.email);
                }
            } catch (error) {
                _logger.error({ error, agentClientId }, '[TC-STRIPE] Failed to retrieve existing Stripe subscription. Attempting to create new one.');
                // Fall through to create a new subscription if retrieval fails
            }
        }

        const planDetails = PLAN_DETAILS[planTier];
        if (!planDetails || !STRIPE_PRICE_MAP[planTier]?.monthly_price_id) {
            _logger.error('[TC-STRIPE] Invalid plan tier or missing Stripe price ID for plan %s.', planTier);
            return null;
        }

        try {
            // Handle setup fee for Founding Members as a one-off invoice item
            if (planTier === PLANS.FOUNDING && planDetails.setup_fee > 0 && !agentClient.setup_paid) {
                const setupPriceId = STRIPE_PRICE_MAP[PLANS.FOUNDING].setup_price_id;
                if (setupPriceId) {
                    await stripe.invoiceItems.create({
                        customer: customer.id,
                        price: setupPriceId,
                        quantity: 1,
                        description: `${planDetails.label} Setup Fee`,
                        metadata: {
                            tc_agent_client_id: agentClient.id,
                            tc_plan: planTier,
                            fee_type: 'setup_fee',
                        },
                    });
                    _logger.info({ customerId: customer.id, setupFee: planDetails.setup_fee }, '[TC-STRIPE] Created setup fee invoice item for Founding Member.');
                } else {
                    _logger.warn('[TC-STRIPE] Missing setup_price_id for Founding Member plan. Setup fee will not be invoiced via Stripe.');
                }
            }

            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: STRIPE_PRICE_MAP[planTier].monthly_price_id }],
                collection_method: 'charge_automatically', // Or 'send_invoice' if Adam needs to manually send
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    tc_agent_client_id: agentClient.id,
                    tc_agent_client_plan: planTier,
                },
            });

            await _pool.query(
                `UPDATE tc_agent_clients SET stripe_subscription_id = $1, stripe_customer_id = $2 WHERE id = $3 RETURNING *`,
                [subscription.id, customer.id, agentClient.id]
            );

            // Mark setup paid in DB if it was handled via Stripe (e.g., via initial invoice item)
            // This assumes the setup fee is part of the first invoice generated by the subscription
            // or a separate invoice item that will be paid. For simplicity, we mark it paid here
            // if it was successfully created as an invoice item.
            if (planTier === PLANS.FOUNDING && planDetails.setup_fee > 0 && !agentClient.setup_paid) {
                await _tcPricingService.markSetupPaid(agentClient.id, { amountPaid: planDetails.setup_fee });
            }

            _logger.info({ subscriptionId: subscription.id, agentClientEmail: agentClient.email, planTier }, '[TC-STRIPE] Created Stripe subscription.');
            return subscription;
        } catch (error) {
            _logger.error({ error, agentClientEmail: agentClient.email, planTier }, '[TC-STRIPE] Failed to create Stripe subscription.');
            return null;
        }
    }

    /**
     * Records a closing charge for a per-transaction agent.
     * This creates a one-off invoice item and finalizes an invoice for Adam's review.
     * @param {number} agentClientId - The ID of the agent client.
     * @param {number} transactionId - The ID of the transaction.
     * @param {number} amountCents - The amount to charge in cents.
     * @returns {object|null} The Stripe Invoice object or null if no-op or failure.
     */
    async function recordClosingCharge(agentClientId, transactionId, amountCents) {
        if (!stripe) {
            _logger.warn('[TC-STRIPE] Stripe not initialized. Skipping recordClosingCharge for client %s, transaction %s.', agentClientId, transactionId);
            return null;
        }

        const agentClient = await _tcPricingService.getAgentClient(agentClientId);
        if (!agentClient) {
            _logger.error('[TC-STRIPE] Agent client %s not found for closing charge.', agentClientId);
            return null;
        }

        let customer = null;
        if (!agentClient.stripe_customer_id) {
            customer = await createAgentStripeCustomer(agentClient);
            if (!customer) return null;
        } else {
            try {
                customer = await stripe.customers.retrieve(agentClient.stripe_customer_id);
                if (!customer || customer.deleted) {
                    _logger.warn('[TC-STRIPE] Existing Stripe customer %s for %s is deleted or invalid. Attempting to create new one.', agentClient.stripe_customer_id, agentClient.email);
                    customer = await createAgentStripeCustomer(agentClient);
                    if (!customer) return null;
                }
            } catch (error) {
                _logger.error({ error, agentClientId }, '[TC-STRIPE] Failed to retrieve Stripe customer %s. Attempting to create new one.', agentClient.stripe_customer_id);
                customer = await createAgentStripeCustomer(agentClient);
                if (!customer) return null;
            }
        }

        try {
            // Create an invoice item
            const invoiceItem = await stripe.invoiceItems.create({
                customer: customer.id,
                amount: amountCents,
                currency: 'usd',
                description: `TC Closing Fee for Transaction ID: ${transactionId}`,
                metadata: {
                    tc_agent_client_id: agentClient.id,
                    tc_transaction_id: transactionId,
                    tc_plan: agentClient.plan,
                    fee_type: 'closing_fee',
                },
            });
            _logger.info({ invoiceItemId: invoiceItem.id, customerId: customer.id, transactionId, amountCents }, '[TC-STRIPE] Created Stripe invoice item for closing charge.');

            // Create and finalize an invoice immediately for Adam's review
            // Adam reviews all billing events.
            const invoice = await stripe.invoices.create({
                customer: customer.id,
                collection_method: 'send_invoice', // Adam reviews, then sends or marks paid
                auto_advance: false, // Adam manually advances
                metadata: {
                    tc_agent_client_id: agentClient.id,
                    tc_transaction_id: transactionId,
                    tc_plan: agentClient.plan,
                },
            });

            const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
            _logger.info({ invoiceId: finalizedInvoice.id, customerId: customer.id, transactionId }, '[TC-STRIPE] Finalized Stripe invoice for closing charge.');

            // Update tc_transactions with the Stripe invoice ID
            await _pool.query(
                `UPDATE tc_transactions SET stripe_invoice_id = $1 WHERE id = $2 RETURNING *`,
                [finalizedInvoice.id, transactionId]
            );

            return finalizedInvoice;
        } catch (error) {
            _logger.error({ error, agentClientEmail: agentClient.email, transactionId, amountCents }, '[TC-STRIPE] Failed to record closing charge.');
            return null;
        }
    }

    /**
     * Retrieves a summary of TC billing revenue.
     * Primarily leverages the existing tc-pricing service's getRevenueSummary.
     * Augments with Stripe-specific metrics like active subscription MRR and pending invoice amounts.
     * @returns {object|null} A revenue summary object or null if no-op or failure.
     */
    async function getTCBillingRevenue() {
        const dbRevenueSummary = await _tcPricingService.getRevenueSummary();

        if (!stripe) {
            _logger.warn('[TC-STRIPE] Stripe not initialized. Returning DB-only revenue summary.');
            return {
                ...dbRevenueSummary,
                stripe_metrics: {
                    stripe_mrr_active_subscriptions: 0,
                    stripe_pending_invoices_amount: 0,
                    stripe_status: 'inactive',
                },
            };
        }

        try {
            let stripeMRR = 0;
            let stripeOutstandingInvoices = 0;

            // Fetch active subscriptions for MRR
            const subscriptions = await stripe.subscriptions.list({ status: 'active', limit: 100 }); // Adjust limit as needed
            for (const sub of subscriptions.data) {
                for (const item of sub.items.data) {
                    if (item.price && item.price.recurring && item.price.recurring.interval === 'month') {
                        stripeMRR += item.price.unit_amount / 100; // Stripe amounts are in cents
                    }
                }
            }

            // Fetch outstanding invoices (for per-transaction and setup fees)
            const invoices = await stripe.invoices.list({ status: 'open', limit: 100 }); // Adjust limit as needed
            for (const inv of invoices.data) {
                stripeOutstandingInvoices += inv.amount_due / 100;
            }

            const stripeMetrics = {
                stripe_mrr_active_subscriptions: stripeMRR,
                stripe_pending_invoices_amount: stripeOutstandingInvoices,
                stripe_status: 'active',
            };

            return {
                ...dbRevenueSummary,
                stripe_metrics: stripeMetrics,
            };
        } catch (error) {
            _logger.error({ error }, '[TC-STRIPE] Failed to get Stripe billing revenue summary. Returning DB-only summary.');
            return {
                ...dbRevenueSummary,
                stripe_metrics: {
                    stripe_mrr_active_subscriptions: 0,
                    stripe_pending_invoices_amount: 0,
                    stripe_status: 'error',
                    error_message: error.message,
                },
            };
        }
    }

    /**
     * Cancels an active Stripe Subscription for an agent client.
     * @param {number} agentClientId - The ID of the agent client.
     * @returns {object|null} The canceled Stripe Subscription object or null if no-op or failure.
     */
    async function cancelTCSubscription(agentClientId) {
        if (!stripe) {
            _logger.warn('[TC-STRIPE] Stripe not initialized. Skipping cancelTCSubscription for client %s.', agentClientId);
            return null;
        }

        const agentClient = await _tcPricingService.getAgentClient(agentClientId);
        if (!agentClient) {
            _logger.error('[TC-STRIPE] Agent client %s not found for subscription cancellation.', agentClientId);
            return null;
        }

        if (!agentClient.stripe_subscription_id) {
            _logger.info('[TC-STRIPE] Agent %s does not have an active Stripe subscription to cancel.', agentClient.email);
            return null;
        }

        try {
            const subscription = await stripe.subscriptions.cancel(agentClient.stripe_subscription_id);

            // Clear the subscription ID in the database
            await _pool.query(
                `UPDATE tc_agent_clients SET stripe_subscription_id = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
                [agentClientId]
            );

            _logger.info({ subscriptionId: subscription.id, agentClientEmail: agentClient.email }, '[TC-STRIPE] Canceled Stripe subscription.');
            return subscription;
        } catch (error) {
            _logger.error({ error, agentClientEmail: agentClient.email, subscriptionId: agentClient.stripe_subscription_id }, '[TC-STRIPE] Failed to cancel Stripe subscription.');
            return null;
        }
    }

    return {
        createAgentStripeCustomer,
        createTCSubscription,
        recordClosingCharge,
        getTCBillingRevenue,
        cancelTCSubscription,
    };
}