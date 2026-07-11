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
  /** Template gallery: 10 curated designs free to toggle/preview; extra variety
   *  and a fully bespoke design are paid upsells (founder direction 2026-07-10). */
  templates: {
    freeCount: Number(process.env.SITE_BUILDER_FREE_TEMPLATE_COUNT || 10),
    additional: {
      oneTimeCents: Number(process.env.SITE_BUILDER_TEMPLATE_ADDITIONAL_CENTS || 1000),
      display: process.env.SITE_BUILDER_TEMPLATE_ADDITIONAL_DISPLAY || '$10',
      description: 'One more design variant beyond the 10 free templates.',
    },
    custom: {
      oneTimeCents: Number(process.env.SITE_BUILDER_TEMPLATE_CUSTOM_CENTS || 3000),
      display: process.env.SITE_BUILDER_TEMPLATE_CUSTOM_DISPLAY || '$30',
      description: 'A fully custom design built to your direction — unique to your business, not from the shared template library.',
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
  return `${pricing.publish.display} beta publish (includes first ${months} months of site management)`;
}

export default SITE_BUILDER_PRICING;
