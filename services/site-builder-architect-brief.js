// SYNOPSIS:
// @ssot docs/products/site-builder/PRODUCT_HOME.md

export function buildCreativeBrief({ businessInfo = {}, opportunityAnalysis = {}, currentSiteBaseline = {} } = {}) {
  const sitemap = [
    { section: 'hero', purpose: 'Introduction and Engagement', priority: 1 },
    { section: 'services/offerings', purpose: 'Showcase Services or Products', priority: 2 },
    { section: 'social-proof', purpose: 'Build Trust with Testimonials', priority: 3 },
    { section: 'contact/cta', purpose: 'Encourage User Action', priority: 4 },
  ];

  if (businessInfo.services) {
    sitemap.push(...businessInfo.services.map((service, index) => ({
      section: `service-${index + 1}`,
      purpose: `Details about ${service}`,
      priority: 5 + index,
    })));
  }

  const brandSignals = {
    industry: businessInfo.industry || 'general',
    tone: businessInfo.tone || 'professional',
    mustHaveElements: businessInfo.mustHaveElements || [],
  };

  const painPointsToAddress = opportunityAnalysis.painPoints || [];

  const baselineToBeat = {
    visualScore: currentSiteBaseline.visualScore || 0,
    structuralSignals: currentSiteBaseline.structuralSignals || {},
  };

  return {
    sitemap,
    brandSignals,
    painPointsToAddress,
    baselineToBeat
  };
}

export default buildCreativeBrief;
