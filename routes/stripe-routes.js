/**
 * STRIPE ROUTES - Express router for Stripe automation
 */

import express from 'express';
import * as stripeAutomation from '../core/stripe-automation.js';

const router = express.Router();

/**
 * POST /api/stripe/setup
 * Creates all products and prices in Stripe if they don't exist
 */
router.post('/setup', async (req, res) => {
  try {
    const result = await stripeAutomation.ensureProductsExist();
    res.json({
      ok: true,
      message: 'Products ensured',
      created: result.created,
      existing: result.existing,
      products: result.products
    });
  } catch (error) {
    console.error('❌ [STRIPE] Setup error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/stripe/checkout
 * Creates checkout session and redirects to Stripe
 * Query params: ?plan=starter|pro|enterprise
 */
router.get('/checkout', async (req, res) => {
  try {
    const { plan } = req.query;
    
    if (!plan || !['starter', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid plan. Use: ?plan=starter|pro|enterprise'
      });
    }
    
    // Optional: get customer ID from session/auth
    const customerId = req.user?.stripe_customer_id || null;
    
    const session = await stripeAutomation.createCheckoutSession(plan, customerId, {
      user_id: req.user?.id || null,
      source: 'api_checkout'
    });
    
    // Redirect to Stripe checkout
    res.redirect(302, session.url);
  } catch (error) {
    console.error('❌ [STRIPE] Checkout error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Webhook is handled directly in server.js with express.raw() middleware
// This route is not used, but kept for reference

/**
 * GET /api/stripe/products
 * Returns saved product/price IDs
 */
router.get('/products', async (req, res) => {
  try {
    const products = await stripeAutomation.getProducts();
    res.json({
      ok: true,
      products
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
