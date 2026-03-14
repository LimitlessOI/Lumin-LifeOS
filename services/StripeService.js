/**
 * Stripe Service — creates Stripe Checkout sessions for one-time payments,
 * redirecting to success/cancel URLs from FRONTEND_URL env var.
 *
 * Dependencies: stripe (npm), process.env.STRIPE_SECRET_KEY, process.env.FRONTEND_URL
 * Exports: StripeService instance (singleton via module.exports)
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  async createCheckoutSession(items) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`
    });
    return session.url;
  }
}

module.exports = new StripeService();