/**
 * SYNOPSIS: Creates and manages Stripe price IDs for product tiers.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createPriceIds(deps) {
  const { pool, logger } = deps;
  const products = ['basic', 'pro', 'enterprise'];
  const prices = {};

  try {
    for (const product of products) {
      const tierName = `${product.charAt(0).toUpperCase() + product.slice(1)} Tier`;

      // Check if a product with this name already exists in Stripe
      const existingProducts = await stripe.products.list({ name: tierName });
      let productData;

      if (existingProducts.data.length > 0) {
        productData = existingProducts.data[0];
      } else {
        productData = await stripe.products.create({
          name: tierName,
        });
      }

      // Check if a price for this product already exists with the correct amount and interval
      const existingPrices = await stripe.prices.list({
        product: productData.id,
        currency: 'usd',
        recurring: { interval: 'month' },
        active: true,
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

      // Store or update the price ID in the database
      const { rows: existingDbPrice } = await pool.query(
        'SELECT id FROM stripe_price_ids WHERE tier = $1',
        [product]
      );

      if (existingDbPrice.length > 0) {
        await pool.query(
          'UPDATE stripe_price_ids SET price_id = $1, tier_name = $2, updated_at = NOW() WHERE tier = $3',
          [priceData.id, tierName, product]
        );
      } else {
        await pool.query(
          'INSERT INTO stripe_price_ids (tier, price_id, tier_name) VALUES ($1, $2, $3)',
          [product, priceData.id, tierName]
        );
      }
    }
    return prices;
  } catch (error) {
    logger.error({ error }, 'Error in createStripePriceIds');
    throw new Error('Failed to create Stripe price IDs');
  }
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