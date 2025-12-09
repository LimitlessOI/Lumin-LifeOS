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