/**
 * SYNOPSIS: Exports createStripePriceTiers — services/stripePriceTierService.js.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
import Stripe from 'stripe';

const stripe = new Stripe('your-stripe-secret-key');

/**
 * Creates pricing tiers for a given product on Stripe.
 *
 * @param {string} productId - The ID of the product for which the price tiers are being created.
 * @param {Object} tiers - An object containing tier details such as unit_amount, currency, interval, pricing_tiers, and tiers_mode.
 * @returns {Promise<Object>} - The created price object from Stripe.
 * @throws {Error} - Throws an error if the Stripe API call fails.
 */
export async function createStripePriceTiers(productId, tiers) {
  try {
    const price = await stripe.prices.create({
      unit_amount: tiers.unit_amount,
      currency: tiers.currency,
      recurring: { interval: tiers.interval },
      product: productId,
      tiers: tiers.pricing_tiers,
      tiers_mode: tiers.tiers_mode,
    });
    return price;
  } catch (error) {
    throw new Error(`Failed to create price tiers: ${error.message}`);
  }
}
