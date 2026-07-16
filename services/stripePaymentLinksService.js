/**
 * SYNOPSIS: Export the function to create a single Stripe payment link
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
// Export the function to create a single Stripe payment link
export async function createStripePaymentLink(priceId) {
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
    });
    return paymentLink.url;
  } catch (error) {
    console.error('Error creating Stripe payment link:', error);
    throw error;
  }
}
