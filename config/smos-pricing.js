/**
 * SYNOPSIS: SocialMediaOS pricing — SOURCE OF TRUTH.
 *
 * `pack` is what LIVE checkout serves today (one-time content pack).
 * `beta`/`trial`/`consent`/`tiers`/`freeAmbassador`/`addOns` are the RATIFIED go-forward
 * subscription model (founder-ratified 2026-07-20). They are the spec the governed billing
 * build works from and are NOT surfaced to customers as buyable until that build (recurring
 * Stripe subscriptions + video-credit meter + card-required trial phase) ships and is
 * SENTRY-proven (SO-001: net-new money-path server code is built by the factory, not by hand).
 * Do not wire tiers to a live "Buy" surface before that gate passes — advertising an
 * unbuildable tier is exactly the theater we forbid.
 *
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */

const dollars = (n) => Math.round(Number(n) * 100);

export const SMOS_PRICING = {
  // ── LIVE TODAY ──────────────────────────────────────────────────────────
  // One-time content pack. Kept for backward compatibility until subscriptions land.
  pack: {
    oneTimeCents: Number(process.env.SMOS_PACK_CENTS || 4900),
    display: process.env.SMOS_PACK_DISPLAY || '$49',
    name: process.env.SMOS_PACK_NAME || 'Social Media OS content pack',
    description:
      process.env.SMOS_PACK_DESCRIPTION
      || 'One coached session → approved Instagram, LinkedIn, and X posts you can download and publish.',
  },

  // ── GO-FORWARD (ratified 2026-07-20; not live until governed billing build ships) ──

  beta: {
    active: true,
    banner:
      'Beta pricing — prices will rise. Lock in now and keep your rate for '
      + `${Number(process.env.SMOS_PRICE_LOCK_YEARS || 2)} years, even as we add features.`,
    priceLockYears: Number(process.env.SMOS_PRICE_LOCK_YEARS || 2),
    // A price lock is an enforceable promise: grandfather locked-in members at their
    // signup rate for the full term even after list prices rise.
    grandfather: true,
  },

  trial: {
    cardRequired: true,            // minimum bar to try — filters for real intent, protects render cost
    freeVideoCredits: 2,           // enough to sample TWO different creation modes
    nudgeSecondCreditToDifferentMode: true,
    dormantUntilStarted: true,     // offer never expires
    clockStartsOnFirstUseOrOpen: true, // no time pressure until they actually begin
    captureVerifiedPhone: true,
    captureVerifiedEmail: true,
    // Card-in bonus: full LifeOS trial — seeds the shared Cognitive Core (the real moat).
    lifeosBundle: { grant: true, days: 30, scope: 'all_features' },
  },

  // Legally-correct consent split (TCPA / CAN-SPAM). NEVER bundle marketing calls/texts
  // into the required Terms checkbox, and never make that consent a condition of purchase.
  consent: {
    requiredTermsCheckbox: {
      required: true,
      label: 'I agree to the Terms of Service and Privacy Policy.',
      covers: ['terms_of_service', 'privacy_policy', 'transactional_messages', 'email_marketing'],
    },
    optionalMarketingCheckbox: {
      required: false,
      defaultChecked: false,
      notAConditionOfPurchase: true,
      channels: ['phone', 'sms', 'ai_voice'],
      label:
        'I agree LimitlessOS may contact me by phone, text, or AI voice for marketing. '
        + 'Optional — not required to use the service. Msg/data rates may apply; opt out anytime.',
    },
    // Relationship/transactional re-touch ("your free video is still waiting") needs no
    // marketing opt-in — it follows up on an action the user started.
    transactionalContactAllowedWithoutOptIn: true,
    // Primary re-engagement channel is AI voice (relationship-framed); SMS promo requires opt-in.
    reEngagementChannels: ['ai_voice', 'email'],
  },

  tiers: [
    {
      id: 'pro',
      name: 'Pro',
      priceCents: Number(process.env.SMOS_PRO_CENTS || dollars(59)),
      interval: 'month',
      videosPerMonth: 4,               // one a week
      repurposePlatforms: 2,
      modes: ['coached_talking_head'],
      thumbnails: true,
      thumbnailAbPerWeek: 1,
      competitorResearchPerWeek: 1,
      note: 'Acquisition wedge — cheaper than the DIY tool stack. Front door; hold at $59.',
    },
    {
      id: 'studio',
      name: 'Studio',
      priceCents: Number(process.env.SMOS_STUDIO_CENTS || dollars(159)),
      interval: 'month',
      videosPerMonth: 12,              // ~3 a week
      repurposePlatforms: 'all',
      modes: ['coached_talking_head', 'faceless_broll', 'short_carousel'],
      thumbnails: true,
      thumbnailAb: 'unlimited',
      competitorResearch: 'unlimited',
      features: ['retention_predictor'],
    },
    {
      id: 'studio_plus',
      name: 'Studio Plus',
      priceCents: Number(process.env.SMOS_STUDIO_PLUS_CENTS || dollars(459)),
      interval: 'month',
      videosPerMonth: 30,
      repurposePlatforms: 'all',
      multiBrand: true,
      modes: ['coached_talking_head', 'faceless_broll', 'short_carousel', 'avatar'],
      // The Curaytor-killer: cross-client learning on the shared substrate.
      features: ['broll_compounding', 'comment_automation', 'cross_client_brain', 'personalized_video_email'],
    },
  ],

  // No-card free seat for the creator rev-share funnel (distinct from the card-required trial).
  freeAmbassador: {
    priceCents: 0,
    videosPerMonth: 1,
    repurposePlatforms: 1,
    forResellers: true,
  },

  // À-la-carte, on any tier. Kept cheap per founder direction ($5–$15); video packs cost
  // more only because rendering has real marginal cost.
  addOns: [
    { id: 'thumbnail_ab', name: 'Thumbnail A/B (5 variants)', priceCents: Number(process.env.SMOS_ADDON_THUMBNAIL_CENTS || dollars(5)) },
    { id: 'competitor_research', name: 'Competitor research pull', priceCents: Number(process.env.SMOS_ADDON_RESEARCH_CENTS || dollars(10)) },
    { id: 'viral_rapid_response', name: 'Viral rapid-response (30-min turnaround)', priceCents: Number(process.env.SMOS_ADDON_RAPID_CENTS || dollars(15)) },
    { id: 'video_pack_4', name: 'Extra 4-video pack', priceCents: Number(process.env.SMOS_ADDON_VIDEOPACK_CENTS || dollars(39)) },
  ],
};

export function getSmosPackOfferSummary(pricing = SMOS_PRICING) {
  return `${pricing.pack.display} content pack — coach, approve, export, post like yourself`;
}

export function getSmosTiers(pricing = SMOS_PRICING) {
  return pricing.tiers.map((t) => ({
    ...t,
    displayPrice: `$${(t.priceCents / 100).toFixed(0)}/mo`,
  }));
}

export default SMOS_PRICING;