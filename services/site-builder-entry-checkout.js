/**
 * SYNOPSIS: Site Builder beta publish checkout — Stripe session create + verify.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import logger from './logger.js';
import { getStripeClient } from './stripe-client.js';
import { SITE_BUILDER_PRICING, getBetaPublishOfferSummary } from '../config/site-builder-pricing.js';

export async function createPublishCheckoutSession({ clientId, businessName, baseUrl, pool }) {
  if (!clientId || !/^[\w-]+$/.test(String(clientId))) {
    return { ok: false, error: 'Invalid clientId' };
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    return { ok: false, error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' };
  }

  const amountCents = SITE_BUILDER_PRICING.publish.oneTimeCents;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, error: 'Invalid publish price configuration' };
  }

  const safeBase = String(baseUrl || '').replace(/\/$/, '');
  const months = SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2;
  const label = businessName ? `Beta publish — ${businessName}` : 'Beta publish your site';
  const description = `${SITE_BUILDER_PRICING.publish.description} (${getBetaPublishOfferSummary()})`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: label,
            description,
          },
          unit_amount: Math.round(amountCents),
        },
        quantity: 1,
      },
    ],
    success_url: `${safeBase}/api/v1/sites/publish/success?clientId=${encodeURIComponent(clientId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${safeBase}/previews/${encodeURIComponent(clientId)}/`,
    metadata: {
      product: 'site-builder-publish',
      clientId: String(clientId),
      beta: 'true',
      careIncludedMonths: String(months),
      offerSummary: getBetaPublishOfferSummary(),
    },
  });

  if (pool) {
    try {
      await pool.query(
        `UPDATE prospect_sites
            SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                updated_at = NOW()
          WHERE client_id = $1`,
        [
          clientId,
          JSON.stringify({
            lastCheckoutSessionId: session.id,
            lastCheckoutAt: new Date().toISOString(),
            betaOffer: getBetaPublishOfferSummary(),
            careIncludedMonths: months,
          }),
        ]
      );
    } catch (err) {
      logger.warn('[SITE-CHECKOUT] Failed to record checkout session on prospect', { error: err.message });
    }
  }

  return {
    ok: true,
    url: session.url,
    sessionId: session.id,
    amountCents,
    offer: getBetaPublishOfferSummary(),
    careIncludedMonths: months,
  };
}

export async function verifyPublishCheckoutSession({ sessionId, clientId, pool }) {
  if (!sessionId || !clientId) {
    return { ok: false, error: 'sessionId and clientId required' };
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    return { ok: false, error: 'Stripe not configured' };
  }

  const session = await stripe.checkout.sessions.retrieve(String(sessionId));
  const paid = session.payment_status === 'paid' || session.status === 'complete';
  const metaClientId = session.metadata?.clientId;

  if (!paid) {
    return { ok: false, error: 'Payment not completed', paymentStatus: session.payment_status };
  }

  if (metaClientId && metaClientId !== String(clientId)) {
    return { ok: false, error: 'Checkout session does not match this preview' };
  }

  const dealValue = (session.amount_total || SITE_BUILDER_PRICING.publish.oneTimeCents) / 100;
  const careMonths = Number(session.metadata?.careIncludedMonths || SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2);
  const careUntil = new Date();
  careUntil.setMonth(careUntil.getMonth() + careMonths);

  if (pool) {
    await pool.query(
      `UPDATE prospect_sites
          SET status = 'converted',
              deal_value = COALESCE(deal_value, $2),
              metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
              updated_at = NOW()
        WHERE client_id = $1`,
      [
        clientId,
        dealValue,
        JSON.stringify({
          publishPaidAt: new Date().toISOString(),
          stripeSessionId: session.id,
          publishTier: 'beta_entry',
          beta: true,
          careIncludedMonths: careMonths,
          careIncludedUntil: careUntil.toISOString(),
          offerSummary: session.metadata?.offerSummary || getBetaPublishOfferSummary(),
        }),
      ]
    );
  }

  return {
    ok: true,
    clientId,
    dealValue,
    sessionId: session.id,
    careIncludedMonths: careMonths,
    careIncludedUntil: careUntil.toISOString(),
  };
}

export default { createPublishCheckoutSession, verifyPublishCheckoutSession };
