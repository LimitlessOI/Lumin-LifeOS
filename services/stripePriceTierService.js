/**
 * SYNOPSIS: Exports createStripePriceTiers — services/stripePriceTierService.js.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
import Stripe from 'stripe';

const stripe = new Stripe('your-stripe-secret-key');

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
