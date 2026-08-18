/**
 * SYNOPSIS: Observes Amazon's real public search results for a candidate
 * product keyword (no seller credentials needed for this step) and scores
 * real opportunity signals: how many entrenched, high-review incumbents
 * exist, how much of the page is paid/sponsored, and what margin survives
 * Amazon's real referral fee at the observed price point. Never fabricates
 * a "buy this" recommendation -- returns the real extracted data plus a
 * clearly-labeled heuristic score, honest about low-confidence cases.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createSession } from './browser-agent.js';

// Amazon's real, published referral fee schedule varies by category (roughly
// 8-45%); 15% is the honest default for "most categories" per Amazon's own
// fee schedule, not a guess -- callers can override with the real category
// fee when known.
const DEFAULT_REFERRAL_FEE_RATE = 0.15;
const ESTIMATED_FULFILLMENT_COST_USD = 6; // rough dropship pack/ship floor, override per supplier

function parsePrice(text) {
  const match = String(text || '').match(/[\d,]+\.\d{2}|\d+/);
  if (!match) return null;
  return Number(match[0].replace(/,/g, ''));
}

function parseReviewCount(text) {
  const cleaned = String(text || '').replace(/[(),]/g, '').trim();
  const match = cleaned.match(/([\d.]+)\s*([KM])?/i);
  if (!match) return 0;
  const base = Number(match[1]);
  if (Number.isNaN(base)) return 0;
  const suffix = (match[2] || '').toUpperCase();
  if (suffix === 'K') return Math.round(base * 1000);
  if (suffix === 'M') return Math.round(base * 1_000_000);
  return Math.round(base);
}

async function extractSearchResults(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[data-component-type="s-search-result"]'));
    return cards.slice(0, 20).map((card, idx) => {
      const titleEl = card.querySelector('h2 span, h2 a span');
      const priceEl = card.querySelector('span.a-price > span.a-offscreen');
      const ratingEl = card.querySelector('span.a-icon-alt');
      const reviewEl = card.querySelector('a[href*="#customerReviews"] span, span[aria-label*="ratings"]');
      const sponsored = Boolean(
        card.querySelector('span.puis-sponsored-label-text, span[aria-label="Sponsored"]') ||
          card.getAttribute('data-component-type') === 'sp-sponsored-result'
      );
      return {
        position: idx + 1,
        title: titleEl?.textContent?.trim() || '',
        price_text: priceEl?.textContent?.trim() || '',
        rating_text: ratingEl?.textContent?.trim() || '',
        review_text: reviewEl?.textContent?.trim() || '',
        sponsored,
        asin: card.getAttribute('data-asin') || '',
      };
    });
  });
}

function scoreOpportunity(results, { referralFeeRate, fulfillmentCostUsd }) {
  const withData = results.filter((r) => r.title && r.price_text);
  if (withData.length === 0) {
    return { opportunity_score: null, confidence: 'DONT_KNOW', reason: 'no_parseable_results' };
  }

  const prices = withData.map((r) => parsePrice(r.price_text)).filter((p) => p != null);
  const reviewCounts = withData.map((r) => parseReviewCount(r.review_text));
  const sponsoredCount = withData.filter((r) => r.sponsored).length;
  const entrenchedIncumbents = reviewCounts.filter((c) => c > 1000).length;

  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const sponsoredDensity = sponsoredCount / withData.length;

  let marginEstimateUsd = null;
  let marginPct = null;
  if (avgPrice != null) {
    const fee = avgPrice * referralFeeRate;
    marginEstimateUsd = Number((avgPrice - fee - fulfillmentCostUsd).toFixed(2));
    marginPct = Number(((marginEstimateUsd / avgPrice) * 100).toFixed(1));
  }

  // Heuristic, explicitly labeled as such -- not a guaranteed-profitable claim.
  // Low competition (few entrenched incumbents, low ad density) + positive
  // margin after real fees = worth a human look, not an auto-buy signal.
  let opportunity_score = 0;
  if (entrenchedIncumbents <= 2) opportunity_score += 40;
  else if (entrenchedIncumbents <= 5) opportunity_score += 15;
  if (sponsoredDensity < 0.3) opportunity_score += 20;
  if (marginPct != null && marginPct > 20) opportunity_score += 40;
  else if (marginPct != null && marginPct > 10) opportunity_score += 15;

  return {
    opportunity_score,
    confidence: 'THINK',
    avg_price_usd: avgPrice != null ? Number(avgPrice.toFixed(2)) : null,
    entrenched_incumbents: entrenchedIncumbents,
    sponsored_density: Number(sponsoredDensity.toFixed(2)),
    margin_estimate_usd: marginEstimateUsd,
    margin_estimate_pct: marginPct,
    result_count: withData.length,
  };
}

export async function researchAmazonKeyword({
  keyword,
  referralFeeRate = DEFAULT_REFERRAL_FEE_RATE,
  fulfillmentCostUsd = ESTIMATED_FULFILLMENT_COST_USD,
  logger = console,
} = {}) {
  if (!String(keyword || '').trim()) {
    return { ok: false, error: 'keyword required' };
  }

  const session = await createSession({ headless: true, logger });
  try {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
    await session.navigate(url);

    const blocked = await session.detectCaptcha();
    if (blocked) {
      return { ok: false, error: 'captcha_or_bot_check', keyword, url };
    }

    const rawResults = await extractSearchResults(session.page);
    if (rawResults.length === 0) {
      return { ok: false, error: 'no_search_results_extracted_selectors_may_be_stale', keyword, url };
    }

    const scored = scoreOpportunity(rawResults, { referralFeeRate, fulfillmentCostUsd });

    return {
      ok: true,
      keyword,
      url,
      observed_at: new Date().toISOString(),
      top_results: rawResults.slice(0, 10),
      ...scored,
    };
  } catch (err) {
    return { ok: false, error: err.message, keyword };
  } finally {
    await session.close().catch(() => {});
  }
}

export default { researchAmazonKeyword };
