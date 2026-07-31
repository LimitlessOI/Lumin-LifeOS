/**
 * SYNOPSIS: Stripe payment route handler for creating and managing payment links
 */
import { Router } from 'express';
import Stripe from 'stripe';

/**
 * Stripe payment route handler for creating and managing payment links
 * for all three tiers: basic, pro, and enterprise.
 */
export function registerStripePaymentRoutes(app) {
  const router = Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Price IDs for the three tiers - configurable via env or defaults
  const PRICE_IDS = {
    basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_default',
    pro: process.env.STRIPE_PRICE_PRO || 'price_pro_default',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_default'
  };

  /**
   * POST /api/stripe/payment-links
   * Create a payment link for a given tier
   * Body: { tier: 'basic' | 'pro' | 'enterprise', quantity?: number, metadata?: object }
   */
  router.post('/payment-links', async (req, res) => {
    try {
      const { tier, quantity = 1, metadata = {} } = req.body;

      if (!PRICE_IDS[tier]) {
        return res.status(400).json({ error: `Invalid tier. Must be one of: ${Object.keys(PRICE_IDS).join(', ')}` });
      }

      const priceId = PRICE_IDS[tier];

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: priceId,
            quantity
          }
        ],
        metadata: {
          tier,
          ...metadata
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: process.env.STRIPE_SUCCESS_URL || 'https://example.com/success'
          }
        }
      });

      res.status(201).json({
        id: paymentLink.id,
        url: paymentLink.url,
        tier,
        priceId,
        active: paymentLink.active
      });
    } catch (error) {
      console.error('Error creating Stripe payment link:', error);
      res.status(500).json({ error: 'Failed to create payment link' });
    }
  });

  /**
   * GET /api/stripe/payment-links/:id
   * Retrieve a payment link by ID
   */
  router.get('/payment-links/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const paymentLink = await stripe.paymentLinks.retrieve(id);

      res.json({
        id: paymentLink.id,
        url: paymentLink.url,
        active: paymentLink.active,
        line_items: paymentLink.line_items,
        metadata: paymentLink.metadata
      });
    } catch (error) {
      console.error('Error retrieving Stripe payment link:', error);
      res.status(500).json({ error: 'Failed to retrieve payment link' });
    }
  });

  /**
   * GET /api/stripe/payment-links
   * List all payment links (optionally filtered by tier via query param)
   */
  router.get('/payment-links', async (req, res) => {
    try {
      const { tier } = req.query;
      const params = { limit: 100 };

      const paymentLinks = await stripe.paymentLinks.list(params);

      let links = paymentLinks.data.map(link => ({
        id: link.id,
        url: link.url,
        active: link.active,
        metadata: link.metadata
      }));

      if (tier) {
        links = links.filter(link => link.metadata.tier === tier);
      }

      res.json({ links });
    } catch (error) {
      console.error('Error listing Stripe payment links:', error);
      res.status(500).json({ error: 'Failed to list payment links' });
    }
  });

  /**
   * POST /api/stripe/payment-links/:id/deactivate
   * Deactivate (archive) a payment link
   */
  router.post('/payment-links/:id/deactivate', async (req, res) => {
    try {
      const { id } = req.params;
      const paymentLink = await stripe.paymentLinks.update(id, { active: false });

      res.json({
        id: paymentLink.id,
        active: paymentLink.active
      });
    } catch (error) {
      console.error('Error deactivating Stripe payment link:', error);
      res.status(500).json({ error: 'Failed to deactivate payment link' });
    }
  });

  // Mount the router under /api/stripe
  app.use('/api/stripe', router);
}