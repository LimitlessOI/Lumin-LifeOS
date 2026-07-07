/**
 * SYNOPSIS: Site Builder entry + upsell pricing (founder-approved entry product model).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

export const SITE_BUILDER_PRICING = {
  publish: {
    oneTimeCents: Number(process.env.SITE_BUILDER_PUBLISH_CENTS || 4900),
    display: process.env.SITE_BUILDER_PUBLISH_DISPLAY || '$49',
    description: 'Publish your upgraded site — go live on your domain',
  },
  carePlan: {
    monthlyCents: Number(process.env.SITE_BUILDER_CARE_PLAN_CENTS || 9700),
    display: process.env.SITE_BUILDER_CARE_PLAN_DISPLAY || '$97/mo',
    description: 'Site + SEO + content maintenance',
  },
  upsells: {
    'logo-brand-kit': { display: '$297', cadence: 'one-time' },
    'corporate-brand-package': { display: '$797', cadence: 'one-time' },
    'clickfunnels-build-ad-placement-management': { display: '$1,497 + $497/mo', cadence: 'build + monthly management' },
    'google-business-profile-local-seo': { display: '$197/mo', cadence: 'monthly' },
    'social-media-management': { display: '$297/mo', cadence: 'monthly' },
    'seo-content-care-plan': { display: '$97/mo', cadence: 'monthly' },
  },
  legacyCloser: {
    starter: { display: '$997', note: 'Upsell tier after entry publish — not front-door pricing' },
    growth: { display: '$1,497', note: 'Upsell tier' },
    fullService: { display: '$297/mo', note: 'Legacy full-service tier' },
  },
};

export default SITE_BUILDER_PRICING;
