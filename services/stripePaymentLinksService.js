/**
 * SYNOPSIS: Export the function to create Stripe payment links for all three tiers
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import stripe from 'stripe'; // Ensure you have initialized stripe with your secret key

// Existing function to create a single Stripe payment link
export async function createStripePaymentLink(priceId) {
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
    });
    return paymentLink.url;
  } catch (error) {
    console.error('Error creating Stripe payment link:', error);
    throw error;
  }
}

// New function to create payment links for all three tiers
export async function createPaymentLinks(tierPriceIds) {
  try {
    const paymentLinks = await Promise.all(
      tierPriceIds.map(priceId => createStripePaymentLink(priceId))
    );
    return paymentLinks;
  } catch (error) {
    console.error('Error creating Stripe payment links for tiers:', error);
    throw error;
  }
}
