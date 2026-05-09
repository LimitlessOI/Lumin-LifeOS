import Stripe from 'stripe';
import { PLANS, PLAN_DETAILS, createTCPricing } from './tc-pricing.js';

// Placeholder Stripe Price IDs. In a production system, these would be configured
// in Stripe and their IDs stored in a configuration file or the database.
// For this exercise, we define them here as examples.
// These should correspond to actual Stripe Price objects created in the Stripe Dashboard.
const STRIPE_PRICE_ID_FOUNDING_MONTHLY = 'price_1Pj123FoundingMonthly'; // Example Stripe Price ID for Founding Member monthly fee ($249)
const STRIPE_PRICE_ID_MONTHLY = 'price_1Pj123Monthly'; // Example Stripe Price ID for Standard Monthly fee ($149)

let stripe;
let tcPricingService; // To hold the instance of createTCPricing
let logger = console; // Default logger

/**
 * Initializes the Stripe client and TC Pricing service.
 * If STRIPE_SECRET_