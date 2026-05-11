import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS } from './tc-pricing.js'; // Assuming tc-pricing.js is in the same directory

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

// Assume these Stripe Price IDs are pre-configured in Stripe.
// In a real scenario, these would be fetched from Stripe or stored in DB/config.
// For this implementation, these are placeholders.
const