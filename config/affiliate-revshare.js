/**
 * SYNOPSIS: Platform affiliate + eXp-style downline revenue-share config (rates, tiers, product map).
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 *
 * Spec: docs/products/marketingos/AFFILIATE_REVSHARE_SPEC.md
 * Open to all accounts (no fee to join). Commissions accrue ONLY on real, paid, non-refunded deals.
 * Defaults are editable via env; downline tiers pay only on recurring revenue.
 */

// Basis points: 3000 = 30%.
export const AFFILIATE_TIERS_BPS = {
  direct: Number(process.env.AFFILIATE_DIRECT_BPS || 3000),   // tier 1 — their own referrals
  tier2: Number(process.env.AFFILIATE_TIER2_BPS || 500),      // downline level 2
  tier3: Number(process.env.AFFILIATE_TIER3_BPS || 300),      // downline level 3
};

// One-time deals pay tier-1 only (no downline) to keep them clean.
// Recurring deals pay tier-1 + downline on every recurring charge.
export const AFFILIATE_ONE_TIME_PAYS_DOWNLINE = false;

// Days a commission row stays `pending` (refund window) before becoming `payable`.
export const AFFILIATE_REFUND_WINDOW_DAYS = Number(process.env.AFFILIATE_REFUND_WINDOW_DAYS || 14);

// Referral attribution cookie lifetime.
export const AFFILIATE_COOKIE_DAYS = Number(process.env.AFFILIATE_COOKIE_DAYS || 90);

// Which product checkouts attribute into the shared ledger. `recurring` drives downline eligibility.
export const AFFILIATE_PRODUCTS = {
  'smos-content-pack': { recurring: false, label: 'SocialMediaOS content pack' },
  'site-builder-publish': { recurring: false, label: 'Site Builder publish' },
  'site-builder-care': { recurring: true, label: 'Site Builder care plan' },
};

// Subscription toggle — downline revshare is only meaningful on recurring revenue.
// PENDING founder decision (price + enable). Kept disabled until confirmed.
export const AFFILIATE_SUBSCRIPTION = {
  enabled: String(process.env.AFFILIATE_SUBSCRIPTION_ENABLED || 'false') === 'true',
  monthlyCents: Number(process.env.AFFILIATE_SUBSCRIPTION_CENTS || 0),
};

export function tierRateBps(tier) {
  if (tier === 1) return AFFILIATE_TIERS_BPS.direct;
  if (tier === 2) return AFFILIATE_TIERS_BPS.tier2;
  if (tier === 3) return AFFILIATE_TIERS_BPS.tier3;
  return 0;
}

export function commissionCents(basisCents, tier) {
  const bps = tierRateBps(tier);
  return Math.round((Number(basisCents) || 0) * bps / 10000);
}

export default {
  AFFILIATE_TIERS_BPS,
  AFFILIATE_ONE_TIME_PAYS_DOWNLINE,
  AFFILIATE_REFUND_WINDOW_DAYS,
  AFFILIATE_COOKIE_DAYS,
  AFFILIATE_PRODUCTS,
  AFFILIATE_SUBSCRIPTION,
  tierRateBps,
  commissionCents,
};
