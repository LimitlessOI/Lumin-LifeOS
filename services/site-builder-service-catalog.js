/**
 * SYNOPSIS: À-la-carte service catalog for editor sidebar upsells.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { SITE_BUILDER_PRICING } from '../config/site-builder-pricing.js';

function upsellPrice(id) {
  return SITE_BUILDER_PRICING.upsells[id]?.display || null;
}

export const SERVICE_CATALOG = [
  {
    id: "logo-brand-kit",
    name: "Logo & brand kit",
    blurb:
      "A clean logo system, color palette, typography direction, and starter brand assets so the business looks consistent everywhere it shows up.",
    price: upsellPrice('logo-brand-kit'),
    cadence: "one-time",
  },
  {
    id: "corporate-brand-package",
    name: "Corporate / brand package",
    blurb:
      "A deeper brand package for teams that need sharper positioning, more polished presentation assets, and a more complete visual system.",
    price: upsellPrice('corporate-brand-package'),
    cadence: "one-time",
  },
  {
    id: "clickfunnels-build-ad-placement-management",
    name: "ClickFunnels build + ad placement / management",
    blurb:
      "A focused funnel build with ad placement and management aimed at turning paid traffic into qualified leads and measurable follow-up opportunities.",
    price: upsellPrice('clickfunnels-build-ad-placement-management'),
    cadence: "build + monthly management",
  },
  {
    id: "google-business-profile-local-seo",
    name: "Managed Google Business Profile + local SEO",
    blurb:
      "managed Google Business Profile + local SEO with the GOAL of ranking on the first page of results for your category",
    price: upsellPrice('google-business-profile-local-seo'),
    cadence: "monthly",
  },
  {
    id: "social-media-management",
    name: "Social-media management",
    blurb:
      "Consistent social content planning and posting designed to keep the business visible, current, and easier for prospects to trust.",
    price: upsellPrice('social-media-management'),
    cadence: "monthly",
  },
  {
    id: "seo-content-care-plan",
    name: "SEO / content care plan",
    blurb:
      "Ongoing SEO and content maintenance focused on improving site quality, covering useful search topics, and building stronger organic visibility over time.",
    price: upsellPrice('seo-content-care-plan'),
    cadence: "monthly",
  },
];

const RECOMMENDATION_RULES = [
  {
    serviceId: "logo-brand-kit",
    keywords: [
      "logo",
      "brand kit",
      "branding",
      "visual identity",
      "identity",
      "colors",
      "typography",
      "inconsistent brand",
      "dated brand",
    ],
  },
  {
    serviceId: "corporate-brand-package",
    keywords: [
      "corporate",
      "brand package",
      "positioning",
      "messaging",
      "presentation",
      "pitch deck",
      "sales deck",
      "professional",
      "credibility",
    ],
  },
  {
    serviceId: "clickfunnels-build-ad-placement-management",
    keywords: [
      "ad",
      "ads",
      "advertising",
      "paid traffic",
      "paid media",
      "facebook ads",
      "google ads",
      "funnel",
      "clickfunnels",
      "landing page",
      "lead gen",
      "lead generation",
      "conversion",
      "no ads",
      "lack ads",
      "lacks ads",
    ],
  },
  {
    serviceId: "google-business-profile-local-seo",
    keywords: [
      "google business",
      "google business profile",
      "gbp",
      "local seo",
      "maps",
      "map pack",
      "local search",
      "reviews",
      "near me",
      "first page",
      "local ranking",
    ],
  },
  {
    serviceId: "social-media-management",
    keywords: [
      "social",
      "social media",
      "instagram",
      "facebook",
      "tiktok",
      "linkedin",
      "video",
      "short form",
      "short-form",
      "reels",
      "content posting",
      "no video",
      "lack video",
      "lacks video",
    ],
  },
  {
    serviceId: "seo-content-care-plan",
    keywords: [
      "seo",
      "content",
      "blog",
      "organic",
      "search",
      "keywords",
      "articles",
      "site content",
      "thin content",
      "content gap",
      "organic traffic",
    ],
  },
];

const appendSearchText = (value, parts) => {
  if (value == null) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) parts.push(trimmed.toLowerCase());
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    parts.push(String(value).toLowerCase());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) appendSearchText(item, parts);
    return;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) appendSearchText(item, parts);
  }
};

const collectStrategyText = (strategy) => {
  const parts = [];

  if (!strategy || typeof strategy !== "object") return "";

  appendSearchText(strategy.gaps, parts);

  const competitors = Array.isArray(strategy.competitors)
    ? strategy.competitors
    : [];

  for (const competitor of competitors) {
    if (!competitor || typeof competitor !== "object") continue;

    appendSearchText(competitor.doesPoorly, parts);
    appendSearchText(competitor.weaknesses, parts);
  }

  return parts.join(" ");
};

const scoreRule = (text, rule) => {
  if (!text) return 0;

  let score = 0;

  for (const keyword of rule.keywords) {
    if (text.includes(keyword)) score += 1;
  }

  return score;
};

export const recommendServices = (strategy) => {
  const text = collectStrategyText(strategy);

  if (!text) {
    return SERVICE_CATALOG.map((service) => ({
      ...service,
      recommended: false,
    }));
  }

  const recommendedIds = new Set();

  for (const rule of RECOMMENDATION_RULES) {
    if (scoreRule(text, rule) > 0) {
      recommendedIds.add(rule.serviceId);
    }
  }

  return SERVICE_CATALOG.map((service) => ({
    ...service,
    recommended: recommendedIds.has(service.id),
  }));
};

const toPositiveSampleSize = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) return 0;

  return Math.trunc(number);
};

const toMeasuredCount = (value, sampleSize) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) return null;

  const count = Math.trunc(number);

  if (count > sampleSize) return null;

  return count;
};

export const formatResultsProof = (results) => {
  if (!results || typeof results !== "object") return null;

  const sampleSize = toPositiveSampleSize(results.sampleSize);

  if (sampleSize <= 0) return null;

  const headline =
    typeof results.headline === "string" ? results.headline.trim() : "";

  const onFirstPage = toMeasuredCount(results.onFirstPage, sampleSize);
  const atNumberOne = toMeasuredCount(results.atNumberOne, sampleSize);

  const metrics = [];

  if (onFirstPage !== null) {
    metrics.push(`${onFirstPage} of ${sampleSize} on page one`);
  }

  if (atNumberOne !== null) {
    metrics.push(`${atNumberOne} at #1`);
  }

  if (headline && metrics.length > 0) {
    return `${headline} — ${metrics.join(", ")}`;
  }

  if (headline) {
    return headline;
  }

  if (metrics.length > 0) {
    return metrics.join(", ");
  }

  return `${sampleSize} measured client${sampleSize === 1 ? "" : "s"}`;
};

export default SERVICE_CATALOG;