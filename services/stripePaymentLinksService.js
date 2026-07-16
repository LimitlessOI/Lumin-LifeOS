/**
 * SYNOPSIS: services/stripePaymentLinksService.js
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
// services/stripePaymentLinksService.js

import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe('your_secret_key_here');

// Function to create payment links
async function createPaymentLinks() {
  try {
    // Define your pricing tiers
    const pricingTiers = [
      { priceId: 'price_123', label: 'Basic Tier' },
      { priceId: 'price_456', label: 'Standard Tier' },
      { priceId: 'price_789', label: 'Premium Tier' },
    ];

    // Generate payment links for each tier
    const paymentLinks = await Promise.all(pricingTiers.map(async (tier) => {
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: tier.priceId, quantity: 1 }],
      });
      return { ...tier, url: paymentLink.url };
    }));

    return paymentLinks;
  } catch (error) {
    console.error('Error creating payment links:', error);
    throw error;
  }
}

// Export the function as ESM
export { createPaymentLinks };
