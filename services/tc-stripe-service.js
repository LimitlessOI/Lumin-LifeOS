import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS } from './tc-pricing.js';
import { createTCPricing } from './tc-pricing.js';

let stripe = null;
let _pool = null;
let _logger = console;
let _tcPricingService = null;

// Placeholder Stripe Price/Product IDs. In a production system, these would be configured
// in Stripe and their IDs stored in a configuration file or the database.
// For this exercise, we define them here as examples, reflecting the task's specified pricing.
const STRIPE_PRICE_MAP = {
    [PLANS.FOUNDING]: {
        monthly_price_id: 'price_FOUNDING_MONTHLY_249', // $249/mo
        setup_price_id: 'price_FOUNDING_SETUP_500',     // $500 one-time
    },
    [PLANS.MONTHLY]: {
        monthly