// SYNOPSIS:
// @ssot docs/products/site-builder/PRODUCT_HOME.md

import { scoreGeneratedSite } from './site-builder-quality-scorer.js';

export async function scoreCurrentSiteBaseline({ html = '', screenshotBuffer = null }) {
  if (!html) {
    return {
      visualScore: 0,
      structuralSignals: {
        hasHeroImage: false,
        navItemCount: 0,
        primaryCtaDetected: false,
        aboveFoldWordCount: 0,
        imageCount: 0
      },
      notes: ['Empty HTML content provided.']
    };
  }

  const scoreResult = scoreGeneratedSite(html, {});
  const visualScore = scoreResult.scorePct;

  // hasHeroImage used to require a screenshotBuffer that no real caller has ever
  // supplied (buildVariants() never passes one) -- it was always false, and the
  // resulting "No hero image detected" note could be factually wrong on a real
  // scorecard shown to a prospect. Real screenshot-based detection is future
  // work; in the meantime, use an honest HTML-based heuristic: an <img> tag or
  // CSS background-image within roughly the first screenful of markup.
  const aboveFoldHtml = html.slice(0, 4000);
  const hasHeroImage = screenshotBuffer
    ? html.includes('<img')
    : /<img[^>]*>/i.test(aboveFoldHtml) || /background-image\s*:\s*url\(/i.test(aboveFoldHtml);
  const navItemCount = (html.match(/<nav/g) || []).length;
  const primaryCtaDetected = /call-to-action|cta/i.test(html);
  const aboveFoldWordCount = (html.split(/\s+/).slice(0, 100).join(' ').match(/\w+/g) || []).length;
  const imageCount = (html.match(/<img/g) || []).length;

  const structuralSignals = {
    hasHeroImage,
    navItemCount,
    primaryCtaDetected,
    aboveFoldWordCount,
    imageCount
  };

  const notes = [];
  if (!hasHeroImage) notes.push('No hero image detected.');
  if (navItemCount === 0) notes.push('No navigation items detected.');
  if (!primaryCtaDetected) notes.push('Primary CTA not detected.');
  if (aboveFoldWordCount < 20) notes.push('Low word count above the fold.');

  return {
    visualScore,
    structuralSignals,
    notes
  };
}

export default scoreCurrentSiteBaseline;
