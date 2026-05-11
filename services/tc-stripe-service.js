import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS, createTCPricing } from './tc-pricing.js';

// Initialize Stripe client
let stripe;
function getStripeClient(logger) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('[TC-BILLING-STRIPE] STRIPE_SECRET_KEY is not set. Stripe operations will be no-ops.');
    return null;
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10', // Use a recent API version
    });
  }
  return stripe;
}

// Placeholder Stripe Price IDs. In a real system, these would be configured or fetched from Stripe.
// ASSUMPTION: These Stripe Price IDs are pre-configured in the Stripe dashboard.
// The actual values would be obtained from Stripe after creating