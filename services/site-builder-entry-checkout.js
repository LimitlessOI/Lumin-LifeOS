/**
 * SYNOPSIS: Site Builder beta publish checkout — Stripe session create + verify.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import logger from './logger.js';
import { getStripeClient } from './stripe-client.js';
import {
  SITE_BUILDER_PRICING,
  getBetaPublishOfferSummary,
  isValidPublishCompCode,
  normalizePublishCompCode,
} from '../config/site-builder-pricing.js';

/**
 * Founder/comp complimentary publish — skips Stripe when code matches SITE_BUILDER_FREE_CODES.
 */
export async function redeemPublishCompCode({ clientId, code, pool, businessName = '' }) {
  if (!clientId || !/^[\w-]+$/.test(String(clientId))) {
    return { ok: false, error: 'Invalid clientId' };
  }
  const normalized = normalizePublishCompCode(code);
  if (!isValidPublishCompCode(normalized)) {
    return { ok: false, error: 'Invalid or unknown complimentary code' };
  }
  if (!pool) {
    return { ok: false, error: 'Database required for complimentary publish' };
  }

  const sessionId = `comp_${crypto.randomBytes(16).toString('hex')}`;
  const careMonths = SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2;
  const careUntil = new Date();
  careUntil.setMonth(careUntil.getMonth() + careMonths);
  const now = new Date().toISOString();

  await pool.query(
    `UPDATE prospect_sites
        SET status = 'converted',
            deal_value = COALESCE(deal_value, 0),
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
      WHERE client_id = $1`,
    [
      clientId,
      JSON.stringify({
        publishPaidAt: now,
        publishTier: 'comp_code',
        beta: true,
        complimentary: true,
        compCode: normalized,
        compRedeemSessionId: sessionId,
        compRedeemedAt: now,
        careIncludedMonths: careMonths,
        careIncludedUntil: careUntil.toISOString(),
        offerSummary: `Complimentary publish via code (${businessName || clientId})`,
      }),
    ],
  );

  logger.info('[SITE-CHECKOUT] Complimentary publish redeemed', {
    clientId,
    code: normalized,
    sessionId,
    businessName: businessName || null,
  });

  return {
    ok: true,
    free: true,
    clientId,
    sessionId,
    code: normalized,
    dealValue: 0,
    careIncludedMonths: careMonths,
    careIncludedUntil: careUntil.toISOString(),
  };
}

export async function createPublishCheckoutSession({ clientId, businessName, baseUrl, pool, templateTier = '', selectedDesign = '' }) {
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
  const label = businessName ? `Taloa — publish ${businessName}` : 'Taloa — publish your site';
  const description = `${SITE_BUILDER_PRICING.publish.description} (${getBetaPublishOfferSummary()})`;

  const lineItems = [
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
  ];

  if (templateTier === 'template-additional' || (selectedDesign && SITE_BUILDER_PRICING.templates.additional.oneTimeCents > 0)) {
    const add = SITE_BUILDER_PRICING.templates.additional;
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${add.slotCount} more site designs`,
          description: add.description,
        },
        unit_amount: Math.round(add.oneTimeCents),
      },
      quantity: 1,
    });
  }

  if (templateTier === 'template-custom') {
    const custom = SITE_BUILDER_PRICING.templates.custom;
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Custom co-design',
          description: custom.description,
        },
        unit_amount: Math.round(custom.oneTimeCents),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    allow_promotion_codes: true,
    success_url: `${safeBase}/api/v1/sites/publish/success?clientId=${encodeURIComponent(clientId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${safeBase}/previews/${encodeURIComponent(clientId)}/`,
    metadata: {
      product: 'site-builder-publish',
      clientId: String(clientId),
      beta: 'true',
      careIncludedMonths: String(months),
      offerSummary: getBetaPublishOfferSummary(),
      templateTier: templateTier || '',
      selectedDesign: selectedDesign || '',
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

  if (String(sessionId).startsWith('comp_')) {
    if (!pool) {
      return { ok: false, error: 'Database required for complimentary verify' };
    }
    const row = await pool.query(
      `SELECT status, metadata, deal_value FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
      [clientId],
    );
    const prospect = row.rows[0];
    const meta = prospect?.metadata || {};
    if (!prospect || meta.compRedeemSessionId !== String(sessionId)) {
      return { ok: false, error: 'Complimentary session not found for this preview' };
    }
    const careMonths = Number(meta.careIncludedMonths || SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2);
    return {
      ok: true,
      free: true,
      clientId,
      dealValue: Number(prospect.deal_value || 0),
      sessionId: String(sessionId),
      careIncludedMonths: careMonths,
      careIncludedUntil: meta.careIncludedUntil || null,
      code: meta.compCode || null,
    };
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

    // Credit the referrer (if any) with one free care month.
    try {
      const converted = await pool.query(
        `SELECT metadata FROM prospect_sites WHERE client_id = $1`,
        [clientId]
      );
      const metadata = converted.rows?.[0]?.metadata || {};
      const referrer = metadata?.referrer || metadata?.referrerClientId;
      if (referrer) {
        const creditUntil = new Date();
        creditUntil.setMonth(creditUntil.getMonth() + 1);
        await pool.query(
          `UPDATE prospect_sites
              SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                  updated_at = NOW()
            WHERE client_id = $1`,
          [
            referrer,
            JSON.stringify({
              referralConvertedAt: new Date().toISOString(),
              referralConvertedClientId: clientId,
              referralCreditEarnedAt: new Date().toISOString(),
              referralCreditUntil: creditUntil.toISOString(),
            }),
          ]
        );
      }
    } catch (err) {
      logger.warn('[SITE-CHECKOUT] Referral credit update failed', { error: err.message });
    }
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

/** Template/color upsells: additional template ($1), fully custom template ($35),
 *  custom brand-color match ($5). Shares the same session-create/verify shape as
 *  the publish checkout above. `kind` selects the price + product metadata. */
const UPSELL_CONFIG = {
  'template-additional': () => ({ ...SITE_BUILDER_PRICING.templates.additional, label: `${SITE_BUILDER_PRICING.templates.additional.slotCount || 10} more site designs` }),
  'template-custom': () => ({ ...SITE_BUILDER_PRICING.templates.custom, label: 'Fully custom site design' }),
  'color-custom': () => ({ ...SITE_BUILDER_PRICING.colors.custom, label: 'Custom brand colors' }),
};

export async function createUpsellCheckoutSession({ clientId, businessName, kind, baseUrl, pool, note }) {
  if (!clientId || !/^[\w-]+$/.test(String(clientId))) {
    return { ok: false, error: 'Invalid clientId' };
  }
  const build = UPSELL_CONFIG[kind];
  if (!build) {
    return { ok: false, error: `Unknown upsell kind: ${kind}` };
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    return { ok: false, error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' };
  }

  const priceInfo = build();
  const amountCents = priceInfo.oneTimeCents;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, error: 'Invalid upsell price configuration' };
  }

  const safeBase = String(baseUrl || '').replace(/\/$/, '');
  const label = businessName ? `${priceInfo.label} — ${businessName}` : priceInfo.label;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: label, description: priceInfo.description },
          unit_amount: Math.round(amountCents),
        },
        quantity: 1,
      },
    ],
    success_url: `${safeBase}/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}&upsell_session_id={CHECKOUT_SESSION_ID}&upsell_kind=${encodeURIComponent(kind)}`,
    cancel_url: `${safeBase}/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}`,
    metadata: {
      product: 'site-builder-upsell',
      kind,
      clientId: String(clientId),
      note: String(note || '').slice(0, 400),
    },
  });

  return { ok: true, url: session.url, sessionId: session.id, amountCents, kind };
}

export async function verifyUpsellCheckoutSession({ sessionId, clientId, kind, pool }) {
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
  const metaKind = session.metadata?.kind;

  if (!paid) {
    return { ok: false, error: 'Payment not completed', paymentStatus: session.payment_status };
  }
  if (metaClientId && metaClientId !== String(clientId)) {
    return { ok: false, error: 'Checkout session does not match this preview' };
  }
  if (kind && metaKind && metaKind !== String(kind)) {
    return { ok: false, error: 'Checkout session does not match the requested upsell' };
  }

  if (pool) {
    const unlockField = metaKind === 'color-custom' ? 'customColorUnlocked' : 'unlockedTemplateSlots';
    const isAdditional = metaKind === 'template-additional';
    const increment = metaKind === 'color-custom'
      ? null
      : (isAdditional ? SITE_BUILDER_PRICING.templates.additional.slotCount || 10 : 1);
    await pool.query(
      `UPDATE prospect_sites
          SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
        WHERE client_id = $1`,
      [
        clientId,
        JSON.stringify(
          increment === null
            ? { [unlockField]: true, lastUpsellSessionId: session.id, lastUpsellKind: metaKind }
            : { lastUpsellSessionId: session.id, lastUpsellKind: metaKind, upsellPurchasedAt: new Date().toISOString() },
        ),
      ],
    );
    if (increment !== null) {
      // Increment additional-template count separately (can't do +1 inside the JSONB merge above).
      await pool.query(
        `UPDATE prospect_sites
            SET metadata = jsonb_set(
                  COALESCE(metadata, '{}'::jsonb),
                  '{unlockedTemplateSlots}',
                  to_jsonb(COALESCE((metadata->>'unlockedTemplateSlots')::int, 0) + $2)
                ),
                updated_at = NOW()
          WHERE client_id = $1`,
        [clientId, increment],
      );
    }
  }

  return { ok: true, clientId, kind: metaKind, sessionId: session.id };
}

export default {
  createPublishCheckoutSession,
  verifyPublishCheckoutSession,
  redeemPublishCompCode,
  createUpsellCheckoutSession,
  verifyUpsellCheckoutSession,
};