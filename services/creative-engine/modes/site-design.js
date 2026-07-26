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
    
    Respond with ONLY a single JSON object, no markdown fences, no commentary, in exactly this shape: {"html": "<the complete HTML document as a string>", "designNotes": ["note1", "note2"]}
  `;

  try {
    const modelResponse = await callCouncilMember(prompt);
    let parsed;
    try {
      parsed = JSON.parse(modelResponse);
    } catch (parseError) {
      return { ok: false, reason: 'invalid_model_output', raw: String(modelResponse).slice(0, 500) };
    }

    if (typeof parsed.html !== 'string' || !/<html/i.test(parsed.html)) {
      return { ok: false, reason: 'missing_html_field', raw: String(modelResponse).slice(0, 500) };
    }

    return {
      ok: true,
      html: parsed.html,
      designNotes: Array.isArray(parsed.designNotes) ? parsed.designNotes : [],
      sitemapUsed: sitemap
    };
  } catch (error) {
    return { ok: false, error };
  }
}
