/**
 * SYNOPSIS: SocialMediaOS content-pack pricing ($49 session pack).
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */

export const SMOS_PRICING = {
  pack: {
    oneTimeCents: Number(process.env.SMOS_PACK_CENTS || 4900),
    display: process.env.SMOS_PACK_DISPLAY || '$49',
    name: process.env.SMOS_PACK_NAME || 'Social Media OS content pack',
    description:
      process.env.SMOS_PACK_DESCRIPTION
      || 'One coached session → approved Instagram, LinkedIn, and X posts you can download and publish.',
  },
};

export function getSmosPackOfferSummary(pricing = SMOS_PRICING) {
  return `${pricing.pack.display} content pack — coach, approve, export, post like yourself`;
}

export default SMOS_PRICING;