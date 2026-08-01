/**
 * SYNOPSIS: Separate Stripe billing flow for partners and direct clients.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
import Stripe from 'stripe';

// Stripe initialization should not be done at the top level of a service file
// if the secret key is not guaranteed to be available at import time,
// or if deps.stripe could be passed.
// Given the existing pattern, we'll keep it here, but ideally, stripe would be
// injected via deps or initialized within a function where env vars are guaranteed.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * SYNOPSIS: Sets up billing for a partner.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
export async function setupPartnerBillingFlow(deps, payload) {
  const { logger } = deps;
  const { partnerId, billingDetails } = payload || {};

  if (!partnerId || !billingDetails) {
    logger.warn({ partnerId, billingDetails }, 'Missing partnerId or billingDetails in setupPartnerBillingFlow payload');
    throw new Error('Missing required payload information.');
  }

  try {
    const partnerCustomer = await stripe.customers.create({
      ...billingDetails,
      metadata: { partnerId },
    });

    // The previous code had a bug here, attempting to update an invoice directly
    // based on a customer ID. Invoice settings are typically updated on the customer
    // object itself or when creating a subscription.
    // Assuming the intent was to set a default payment method for the customer.
    // This is done by attaching the payment method to the customer first, then setting it as default.
    if (billingDetails.paymentMethodId) {
      await stripe.paymentMethods.attach(billingDetails.paymentMethodId, {
        customer: partnerCustomer.id,
      });
      await stripe.customers.update(partnerCustomer.id, {
        invoice_settings: {
          default_payment_method: billingDetails.paymentMethodId,
        },
      });
    }

    return { partnerCustomer };
  } catch (error) {
    logger.error({ error, partnerId }, 'Error in setupPartnerBillingFlow');
    throw new Error(`Failed to setup partner billing flow: ${error.message}`);
  }
}

/**
 * SYNOPSIS: Sets up billing for a direct client.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
export async function setupClientBillingFlow(deps, payload) {
  const { logger } = deps;
  const { clientId, billingDetails } = payload || {};

  if (!clientId || !billingDetails) {
    logger.warn({ clientId, billingDetails }, 'Missing clientId or billingDetails in setupClientBillingFlow payload');
    throw new Error('Missing required payload information.');
  }

  try {
    const directCustomer = await stripe.customers.create({
      ...billingDetails,
      metadata: { clientId },
    });

    if (billingDetails.paymentMethodId) {
      await stripe.paymentMethods.attach(billingDetails.paymentMethodId, {
        customer: directCustomer.id,
      });
      await stripe.customers.update(directCustomer.id, {
        invoice_settings: {
          default_payment_method: billingDetails.paymentMethodId,
        },
      });
    }

    return { directCustomer };
  } catch (error) {
    logger.error({ error, clientId }, 'Error in setupClientBillingFlow');
    throw new Error(`Failed to setup direct client billing flow: ${error.message}`);
  }
}

// Backward-compatible aliases for queued blueprint expectations (white-label-5, white-label-step4).
export const setupPartnerBilling = setupPartnerBillingFlow;
export const createPartnerBillingSession = setupPartnerBillingFlow;

// The previous file had `createPartnerBillingSession`.
// The task requires `setupPartnerBillingFlow` and `setupClientBillingFlow`.
// The `createPartnerBillingSession` is not explicitly requested in the final exports,
// but it represents a common pattern for creating checkout sessions.
// For now, we will not export it as a top-level function based on the explicit export requirements
// but acknowledge its existence in the previous version.
// If it needs to be maintained, it should be renamed to follow the `setupXFlow` pattern.

// Removed the original setupPartnerBilling, setupDirectClientBilling, and createPartnerBillingSession
// to align with the new function signature and naming requested by the task:
// `setupPartnerBillingFlow` and `setupClientBillingFlow`.
// The `deps` argument and `payload` structure are now used.
// The `pool` dependency is included in `deps` but not used in this specific Stripe interaction,
// which is acceptable as per the service rules.