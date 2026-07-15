/**
 * SYNOPSIS: Service module — StripePaymentService.
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

const registerStripePaymentService = () => {
  console.log('Stripe payment service registered');
  pricingTiers.forEach(async (tier) => {
    try {
      const link = await createPaymentLink(tier.id);
      console.log(`Payment link for ${tier.name}: ${link}`);
    } catch (error) {
      console.error(`Failed to create payment link for ${tier.name}`, error);
    }
  });
};

export { registerStripePaymentService, createPaymentLink, pricingTiers };
