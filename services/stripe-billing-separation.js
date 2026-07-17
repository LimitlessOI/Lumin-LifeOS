/**
 * SYNOPSIS: Exports setupPartnerBilling — services/stripe-billing-separation.js.
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function setupPartnerBilling(partnerId, billingDetails) {
  try {
    const partnerCustomer = await stripe.customers.create({
      ...billingDetails,
      metadata: { partnerId },
    });

    const invoiceSettings = await stripe.invoices.update(partnerCustomer.id, {
      default_payment_method: billingDetails.paymentMethodId,
    });

    return { partnerCustomer, invoiceSettings };
  } catch (error) {
    throw new Error(`Failed to setup partner billing: ${error.message}`);
  }
}

export async function setupDirectClientBilling(clientId, billingDetails) {
  try {
    const directCustomer = await stripe.customers.create({
      ...billingDetails,
      metadata: { clientId },
    });

    const invoiceSettings = await stripe.invoices.update(directCustomer.id, {
      default_payment_method: billingDetails.paymentMethodId,
    });

    return { directCustomer, invoiceSettings };
  } catch (error) {
    throw new Error(`Failed to setup direct client billing: ${error.message}`);
  }
}
