const stripeClient = require('../config/stripe');

// Example function to create a payment
async function createPayment(amount, currency) {
  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

module.exports = { createPayment };