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

  const hasHeroImage = !!screenshotBuffer && html.includes('<img');
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
