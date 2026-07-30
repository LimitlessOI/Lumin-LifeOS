/**
 * SYNOPSIS: Exports createPriceIds — services/stripePriceService.js.
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createPriceIds() {
  const products = ['basic', 'pro', 'enterprise'];
  const prices = {};

  for (const product of products) {
    // Check if a product with this name already exists
    const existingProducts = await stripe.products.list({ name: `${product.charAt(0).toUpperCase() + product.slice(1)} Tier` });
    let productData;

    if (existingProducts.data.length > 0) {
      productData = existingProducts.data[0];
    } else {
      productData = await stripe.products.create({
        name: `${product.charAt(0).toUpperCase() + product.slice(1)} Tier`,
      });
    }

    // Check if a price for this product already exists with the correct amount and interval
    const existingPrices = await stripe.prices.list({
      product: productData.id,
      currency: 'usd',
      recurring: { interval: 'month' },
      active: true, // Only consider active prices
    });

    let priceData;
    const targetAmount = getAmountForTier(product);

    const matchingPrice = existingPrices.data.find(price => price.unit_amount === targetAmount);

    if (matchingPrice) {
      priceData = matchingPrice;
    } else {
      // If no matching price, create a new one. Deactivate old ones if they exist for this product.
      for (const oldPrice of existingPrices.data) {
        if (oldPrice.unit_amount !== targetAmount) {
          await stripe.prices.update(oldPrice.id, { active: false });
        }
      }
      priceData = await stripe.prices.create({
        unit_amount: targetAmount,
        currency: 'usd',
        recurring: { interval: 'month' },
        product: productData.id,
      });
    }
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