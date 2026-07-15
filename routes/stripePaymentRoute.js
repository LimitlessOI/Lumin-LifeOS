/**
 * SYNOPSIS: Registers StripePaymentRoutes routes/handlers (routes/stripePaymentRoute.js).
 */
import express from 'express';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe('your-stripe-secret-key');

async function createPaymentLink(tier) {
  const productMap = {
    basic: 'prod_basic_id',
    standard: 'prod_standard_id',
    premium: 'prod_premium_id',
  };

  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: productMap[tier],
          quantity: 1,
        },
      ],
    });
    return paymentLink.url;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

router.post('/create-payment-link', async (req, res) => {
  const { tier } = req.body;
  if (!['basic', 'standard', 'premium'].includes(tier)) {
    return res.status(400).send('Invalid tier');
  }

  try {
    const paymentLinkUrl = await createPaymentLink(tier);
    res.json({ url: paymentLinkUrl });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

export function registerStripePaymentRoutes(app) {
  app.use('/stripe', router);
}