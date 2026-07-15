/**
 * SYNOPSIS: Service module — StripePriceService.
 */
import Stripe from 'stripe';

const stripe = new Stripe('your-stripe-secret-key');

async function createPriceIds(tiers) {
  try {
    const priceIds = {};

    for (const tier of tiers) {
      const product = await stripe.products.create({
        name: tier.name,
      });

      const price = await stripe.prices.create({
        unit_amount: tier.amount,
        currency: tier.currency,
        recurring: { interval: tier.interval },
        product: product.id,
      });

      priceIds[tier.name] = price.id;
    }

    return priceIds;
  } catch (error) {
    console.error('Error creating price IDs:', error);
    throw error;
  }
}

export { createPriceIds };
