const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeProduct(course) {
  try {
    const product = await stripe.products.create({
      name: course.title,
      description: course.description
    });

    await stripe.prices.create({
      unit_amount: course.price * 100, // Stripe expects cents
      currency: course.currency,
      product: product.id
    });
  } catch (error) {
    throw new Error(`Failed to create Stripe product: ${error.message}`);
  }
}

module.exports = { createStripeProduct };