/**
 * SYNOPSIS: Exports createPriceIds — services/stripePriceService.js.
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createPriceIds() {
  const products = ['basic', 'pro', 'enterprise'];
  const prices = {};

  for (const product of products) {
    const productData = await stripe.products.create({
      name: `${product.charAt(0).toUpperCase() + product.slice(1)} Tier`,
    });

    const priceData = await stripe.prices.create({
      unit_amount: getAmountForTier(product), // Define your amounts
      currency: 'usd',
      recurring: { interval: 'month' },
      product: productData.id,
    });
    prices[product] = priceData.id;
  }
  return prices;
}

function getAmountForTier(tier) {
  switch (tier) {
    case 'basic':
      return 1000; // $10.00
    case 'pro':
      return 5000; // $50.00
    case 'enterprise':
      return 10000; // $100.00
    default:
      return 0;
  }
}