```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function processPayment(amount, currency, source, description) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: source,
      description,
      confirm: true,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw new Error('Payment processing failed');
  }
}

module.exports = { processPayment };
```