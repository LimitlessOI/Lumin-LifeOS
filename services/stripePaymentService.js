/**
 * SYNOPSIS: Service module — StripePaymentService.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import Stripe from 'stripe';

const stripe = new Stripe('your-stripe-secret-key');

const pricingTiers = [
  { id: 'price_1', amount: 500, currency: 'usd', name: 'Basic' },
  { id: 'price_2', amount: 1000, currency: 'usd', name: 'Standard' },
  { id: 'price_3', amount: 2000, currency: 'usd', name: 'Premium' },
];

const createPaymentLink = async (priceId) => {
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
    });
    return paymentLink.url;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
};

const createPaymentLinks = async () => {
  const links = {};
  for (const tier of pricingTiers) {
    try {
      const link = await createPaymentLink(tier.id);
      links[tier.name] = link;
      console.log(`Payment link for ${tier.name}: ${link}`);
    } catch (error) {
      console.error(`Failed to create payment link for ${tier.name}`, error);
    }
  }
  return links;
};

const registerStripePaymentService = () => {
  console.log('Stripe payment service registered');
  createPaymentLinks();
};

export { registerStripePaymentService, createPaymentLink, createPaymentLinks, pricingTiers };
