/**
 * SYNOPSIS: SocialMediaOS $49 pack Stripe checkout + verify unlock.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import logger from './logger.js';
import { getStripeClient } from './stripe-client.js';
import { SMOS_PRICING, getSmosPackOfferSummary } from '../config/smos-pricing.js';

export function isMatchingPaidSmosPackCheckout(session, expectedMarketingSessionId) {
  const metaSession = session?.metadata?.marketing_session_id || '';
  return session?.mode === 'payment'
    && session?.payment_status === 'paid'
    && session?.metadata?.product === 'smos-content-pack'
    && Boolean(metaSession)
    && (!expectedMarketingSessionId || metaSession === expectedMarketingSessionId);
}

export async function createSmosPackCheckoutSession({
  sessionId,
  ownerId = 'adam',
  baseUrl,
  pool,
} = {}) {
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(String(sessionId))) {
    return { ok: false, error: 'Valid marketing sessionId is required' };
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    return { ok: false, error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' };
  }

  const amountCents = SMOS_PRICING.pack.oneTimeCents;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, error: 'Invalid SMOS pack price configuration' };
  }

  const safeBase = String(baseUrl || '').replace(/\/$/, '');
  if (!safeBase) {
    return { ok: false, error: 'baseUrl is required for checkout redirects' };
  }

  if (pool) {
    const owned = await pool.query(
      `SELECT id, status FROM marketing_sessions WHERE id = $1 LIMIT 1`,
      [sessionId]
    );
    if (!owned.rows.length) {
      return { ok: false, error: 'Session not found' };
    }
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: SMOS_PRICING.pack.name,
            description: SMOS_PRICING.pack.description,
          },
          unit_amount: Math.round(amountCents),
        },
        quantity: 1,
      },
    ],
    success_url: `${safeBase}/marketing/session/${encodeURIComponent(sessionId)}/export?paid=1&checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${safeBase}/marketing/session/${encodeURIComponent(sessionId)}/export?cancelled=1`,
    metadata: {
      product: 'smos-content-pack',
      marketing_session_id: String(sessionId),
      owner_id: String(ownerId || 'adam'),
      offer: getSmosPackOfferSummary(),
    },
  });

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO marketing_pack_checkouts (session_id, stripe_session_id, amount_cents, status, created_at)
         VALUES ($1, $2, $3, 'created', NOW())
         ON CONFLICT (stripe_session_id) DO NOTHING`,
        [sessionId, checkout.id, amountCents]
      );
    } catch (err) {
      // Table may not exist yet — checkout still works; verify path uses Stripe.
      logger.warn('[SMOS-CHECKOUT] Could not persist checkout row', { error: err.message });
    }
  }

  return {
    ok: true,
    url: checkout.url,
    sessionId: checkout.id,
    amountCents,
    offer: getSmosPackOfferSummary(),
  };
}

export async function verifySmosPackCheckoutSession({ checkoutSessionId, expectedMarketingSessionId } = {}) {
  if (!checkoutSessionId) {
    return { ok: false, error: 'checkout_session_id is required', paid: false };
  }
  if (!/^cs_[a-zA-Z0-9_]+$/.test(String(checkoutSessionId))) {
    return { ok: false, error: 'invalid_checkout_session_id', paid: false };
  }
  const stripe = await getStripeClient();
  if (!stripe) {
    return { ok: false, error: 'Stripe not configured', paid: false };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(String(checkoutSessionId));
  } catch (err) {
    const msg = String(err?.message || err || 'stripe_retrieve_failed');
    if (/no such checkout\.session/i.test(msg)) {
      return { ok: false, error: 'checkout_session_not_found', paid: false };
    }
    return { ok: false, error: 'stripe_verify_failed', paid: false, detail: msg.slice(0, 160) };
  }

  const metaSession = session.metadata?.marketing_session_id || '';
  if (!isMatchingPaidSmosPackCheckout(session, expectedMarketingSessionId)) {
    if (session.payment_status !== 'paid') {
      return {
        ok: false,
        error: 'payment_incomplete',
        paid: false,
        status: session.status,
        payment_status: session.payment_status,
      };
    }
    return { ok: false, error: 'checkout_session_mismatch', paid: false };
  }
  return {
    ok: true,
    paid: true,
    marketingSessionId: metaSession,
    stripeSessionId: session.id,
    amountTotal: session.amount_total,
  };
}

export default {
  createSmosPackCheckoutSession,
  verifySmosPackCheckoutSession,
};