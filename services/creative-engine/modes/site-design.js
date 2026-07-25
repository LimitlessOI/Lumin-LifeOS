// SYNOPSIS:
// @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md

export async function runSiteDesign({ creativeBrief, callCouncilMember }) {
  const { sitemap, brandSignals, painPointsToAddress, baselineToBeat } = creativeBrief;

  const prompt = `
    Based on the provided sitemap and brand signals, design a website that addresses the specified pain points and exceeds the baseline performance. 
    Ensure that the site has a strong hero presence, appropriate CTA placement, and balanced information density per section.
    
    Sitemap: ${JSON.stringify(sitemap)}
    Brand Signals: ${JSON.stringify(brandSignals)}
    Pain Points to Address: ${JSON.stringify(painPointsToAddress)}
    Baseline to Beat: ${JSON.stringify(baselineToBeat)}
  `;

  try {
    const modelResponse = await callCouncilMember(prompt);
    if (!modelResponse || !modelResponse.includes('<html')) {
      return { ok: false, reason: 'invalid_model_output', raw: modelResponse };
    }

    // Assuming the response has a defined structure: { html, designNotes }
    const { html, designNotes } = JSON.parse(modelResponse);
    
    return { ok: true, html, designNotes, sitemapUsed: sitemap };
  } catch (error) {
    return { ok: false, error };
  }
}
