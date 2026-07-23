/**
 * SYNOPSIS: Site Builder entry + upsell pricing (beta publish offer).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

export const SITE_BUILDER_PRICING = {
  beta: true,
  publish: {
    oneTimeCents: Number(process.env.SITE_BUILDER_PUBLISH_CENTS || 4500),
    display: process.env.SITE_BUILDER_PUBLISH_DISPLAY || '$45',
    description:
      process.env.SITE_BUILDER_PUBLISH_DESCRIPTION
      || 'Beta publish — go live on your domain. Includes first 2 months of site management.',
  },
  carePlan: {
    monthlyCents: Number(process.env.SITE_BUILDER_CARE_PLAN_CENTS || 3500),
    display: process.env.SITE_BUILDER_CARE_PLAN_DISPLAY || '$35/mo',
    description: 'Site + SEO + content maintenance (must stay under publish price)',
    /** Free months included with beta publish checkout */
    includedMonthsOnPublish: Number(process.env.SITE_BUILDER_CARE_INCLUDED_MONTHS || 2),
  },
  upsells: {
    'logo-brand-kit': { display: '$297', cadence: 'one-time' },
    'corporate-brand-package': { display: '$797', cadence: 'one-time' },
    'clickfunnels-build-ad-placement-management': { display: '$1,497 + $497/mo', cadence: 'build + monthly management' },
    'google-business-profile-local-seo': { display: '$197/mo', cadence: 'monthly' },
    'social-media-management': { display: '$297/mo', cadence: 'monthly' },
    'seo-content-care-plan': { display: '$35/mo', cadence: 'monthly' },
  },
  /** Template gallery: 5 free designs to toggle/preview; 10 more paid for $1
   *  and a fully bespoke design are paid upsells (founder direction 2026-07-13). */
  templates: {
    freeCount: Number(process.env.SITE_BUILDER_FREE_TEMPLATE_COUNT || 5),
    additional: {
      oneTimeCents: Number(process.env.SITE_BUILDER_TEMPLATE_ADDITIONAL_CENTS || 100),
      display: process.env.SITE_BUILDER_TEMPLATE_ADDITIONAL_DISPLAY || '$1',
      description: 'Preview and switch to any of 10 additional professionally-designed templates; pay only when you publish.',
      slotCount: 10,
    },
    custom: {
      oneTimeCents: Number(process.env.SITE_BUILDER_TEMPLATE_CUSTOM_CENTS || 3500),
      display: process.env.SITE_BUILDER_TEMPLATE_CUSTOM_DISPLAY || '$35',
      description: 'Co-design a fully custom template and website with us — unique to your business, never duplicated. Directed conversation + research; locked and paid only when you approve it.',
    },
  },
  /** Preset color palettes are free; a fully custom brand-color match is a paid upsell. */
  colors: {
    custom: {
      oneTimeCents: Number(process.env.SITE_BUILDER_CUSTOM_COLOR_CENTS || 500),
      display: process.env.SITE_BUILDER_CUSTOM_COLOR_DISPLAY || '$5',
      description: 'Match your exact brand colors instead of choosing from the free presets.',
    },
  },
  legacyCloser: {
    starter: { display: '$997', note: 'Upsell tier after entry publish — not front-door pricing' },
    growth: { display: '$1,497', note: 'Upsell tier' },
    fullService: { display: '$297/mo', note: 'Legacy full-service tier' },
  },
};

export function getBetaPublishOfferSummary(pricing = SITE_BUILDER_PRICING) {
  const months = pricing.carePlan?.includedMonthsOnPublish || 2;
  return `${pricing.publish.display} beta-tester publish (includes first ${months} months of care) — priced for feedback while we learn, not full retail`;
}

/** Complimentary / founder gift codes — set via SITE_BUILDER_FREE_CODES (comma-separated). */
export function normalizePublishCompCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

export function getPublishCompCodes() {
  const raw = process.env.SITE_BUILDER_FREE_CODES || process.env.SITE_BUILDER_COMP_CODES || '';
  return [...new Set(
    String(raw)
      .split(/[,;\n]+/)
      .map((part) => normalizePublishCompCode(part))
      .filter((code) => code.length >= 4),
  )];
}

export function isValidPublishCompCode(code) {
  const normalized = normalizePublishCompCode(code);
  if (!normalized || normalized.length < 4) return false;
  return getPublishCompCodes().includes(normalized);
}

/** One-line reason-why for print/email (Claude Hopkins: always explain the deal). */
export function getBetaDealReasonWhy(pricing = SITE_BUILDER_PRICING) {
  const months = pricing.carePlan?.includedMonthsOnPublish || 2;
  return `We're in beta testing. That's why publish is only ${pricing.publish.display} (with ${months} months of care included) instead of a full agency build — your honest reaction helps us finish the product.`;
}

export default SITE_BUILDER_PRICING;