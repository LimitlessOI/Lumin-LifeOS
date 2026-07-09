/**
 * SYNOPSIS: Lazy Stripe client helper — avoids coupling Stripe routes to command-center runtime boot.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import logger from './logger.js';

let stripeClient = null;

export async function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return null;
  if (stripeClient) return stripeClient;

  try {
    let Stripe;
    try {
      const stripeModule = await import('stripe');
      Stripe = stripeModule.default || stripeModule.Stripe || stripeModule;
    } catch {
      logger.warn('⚠️ Stripe package not installed - Stripe features disabled');
      logger.warn('   To enable: npm install stripe');
      return null;
    }

    if (!Stripe) return null;

    stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });
    logger.info('✅ Stripe client initialized');
    return stripeClient;
  } catch (err) {
    logger.warn('⚠️ Stripe initialization error (non-fatal):', { error: err.message });
    return null;
  }
}

export default { getStripeClient };
