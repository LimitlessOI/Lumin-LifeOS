```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../../utils/logger');

async function processPayment(amount, currency, source) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: source,
      confirm: true, // Automatically confirm the payment
    });
    return paymentIntent;
  } catch (error) {
    logger.error('Error processing payment:', error);
    throw new Error('Payment processing failed');
  }
}

module.exports = {
  processPayment
};
```