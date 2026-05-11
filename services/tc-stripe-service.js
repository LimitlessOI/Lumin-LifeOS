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

// Placeholder Stripe Price/Product IDs. In a real system, these would be configured or fetched.
// ASSUMPTION: These Stripe Price/Product IDs are pre-configured in the Stripe dashboard.
const STRIPE_PRICE_IDS = {