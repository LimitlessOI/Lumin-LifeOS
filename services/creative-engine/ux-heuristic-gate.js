// SYNOPSIS:
// @ssot docs/products/site-builder/PRODUCT_HOME.md

export function scoreUxHeuristics(html) {
  const result = {
    ctaPlacement: { score: 0, note: '' },
    informationDensity: { score: 0, verdict: '', wordsPerScreen: 0 },
    visualHierarchy: { score: 0, hasSingleH1: false, headingNestingValid: false },
    navConvention: { score: 0, note: '' },
    overall: 0
  };

  try {
    // Simple DOM parsing
    const bodyContent = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    const words = bodyContent.split(/\s+/).filter(word => word.length > 0);
    
    // CTA Placement
    const ctaRegex = /(book|call|contact|schedule|get started)/i;
    const ctaMatches = bodyContent.match(new RegExp(`(<a[^>]*?>.*?${ctaRegex.source}.*?<\/a>|<button[^>]*?>.*?${ctaRegex.source}.*?<\/button>)`, 'gi')) || [];
    const first600Words = words.slice(0, 600).join(' ');
    const last600Words = words.slice(-600).join(' ');
    const firstCTA = ctaMatches.find(cta => first600Words.includes(cta));
    const lastCTA = ctaMatches.find(cta => last600Words.includes(cta));
    result.ctaPlacement.score = firstCTA && lastCTA ? 10 : 0;
    result.ctaPlacement.note = firstCTA && lastCTA ? 'CTAs well-placed' : 'CTAs poorly placed or missing';

    // Information Density
    let sections = bodyContent.split(/<\/section>|<\/div>|<\/h[1-6]>/i);
    let wordsPerSection = sections.map(sec => sec.split(/\s+/).filter(word => word.length > 0).length);
    result.informationDensity.wordsPerScreen = Math.floor(words.reduce((acc, cur) => acc + cur.length, 0) / sections.length);
    let overloadedCount = wordsPerSection.filter(count => count > 250).length;
    let sparseCount = wordsPerSection.filter(count => count < 20).length;
    if (overloadedCount) {
      result.informationDensity.verdict = 'overloaded';
    } else if (sparseCount) {
      result.informationDensity.verdict = 'sparse';
    } else {
      result.informationDensity.verdict = 'balanced';
    }
    result.informationDensity.score = result.informationDensity.verdict === 'balanced' ? 10 : 5;

    // Visual Hierarchy
    const h1Matches = bodyContent.match(/<h1[^>]*?>[\s\S]*?<\/h1>/gi) || [];
    result.visualHierarchy.hasSingleH1 = h1Matches.length === 1;
    const headingMatches = bodyContent.match(/<h[1-6][^>]*?>/gi) || [];
    let validNesting = true;
    let lastLevel = 0;
    headingMatches.forEach(tag => {
      const level = parseInt(tag.match(/<h([1-6])/i)[1], 10);
      if (level - lastLevel > 1) validNesting = false;
      lastLevel = level;
    });
    result.visualHierarchy.headingNestingValid = validNesting;
    result.visualHierarchy.score = (result.visualHierarchy.hasSingleH1 && validNesting) ? 10 : 5;

    // Navigation Convention
    const navMatches = bodyContent.match(/<nav[^>]*?>[\s\S]*?<\/nav>/gi) || [];
    let linkCount = 0;
    navMatches.forEach(nav => {
      linkCount += (nav.match(/<a[^>]*?>/gi) || []).length;
    });
    result.navConvention.score = (linkCount >= 3 && linkCount <= 7) ? 10 : 5;
    result.navConvention.note = linkCount >= 3 && linkCount <= 7 ? 'Optimal nav link count' : 'Nav link count outside optimal range';

    // Overall
    const scoreSum = result.ctaPlacement.score + result.informationDensity.score + result.visualHierarchy.score + result.navConvention.score;
    result.overall = Math.floor((scoreSum / 40) * 100);
  } catch (error) {
    result.ctaPlacement.note = result.informationDensity.verdict = result.visualHierarchy.note = result.navConvention.note = 'Parsing Error';
  }

  return result;
}

export default scoreUxHeuristics;
