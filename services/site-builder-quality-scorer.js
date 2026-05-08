const CRITERIA = [
  { key: 'hasDoctype', pts: 5, test: h => /<!DOCTYPE\s+html/i.test(h), issue: 'Missing DOCTYPE declaration' },
  { key: 'hasMobileViewport', pts: 8, test: h => /name=["']viewport["']/i.test(h), issue: 'Missing mobile viewport meta tag' },
  { key: 'hasSingleH1', pts: 5, test: h => (h.match(/<h1[\s>]/gi) || []).length === 1, issue: 'Expected exactly one H1 heading' },
  { key: 'hasMultipleH2s', pts: 4, test: h => (h.match(/<h2[\s>]/gi) || []).length >= 3, issue: 'Missing enough H2 sections to structure the page' },
  { key: 'hasStrongCTA', pts: 8, test: h => /(book|schedule|contact us|call us|get started|free consultation|free preview)/i.test(h), issue: 'Missing strong call-to-action language' },
  { key: 'hasRepeatedCTAs', pts: 6, test: h => ((h.match(/(<a|<button)[^>]*?(book|schedule|contact us|call us|get started|free consultation|free preview)/gi) || []).length >= 3), issue: 'CTA does not repeat enough through the page' },
  { key: 'hasProminentCTAs', pts: 6, test: h => ((h.match(/(<a|<button)[^>]+(bg-gradient|shadow-lg|px-\d+\s+py-\d+)[^>]*?(book|schedule|contact us|call us|get started|free consultation|free preview)/gi) || []).length >= 1), issue: 'Missing visually prominent CTA button' },
  { key: 'hasTestimonials', pts: 8, test: h => /(testimonial|review|what clients value|why families choose|social proof|results|client stories)/i.test(h), issue: 'Missing a trust or testimonial section' },
  { key: 'hasStarRatingsOrTrustStats', pts: 5, test: h => /(★|&#9733;|\d+\sstar\srating|\d+\+\sclients\sserved|\d+\syears\sexperience)/i.test(h), issue: 'Missing star ratings or key trust statistics' },
  { key: 'hasOfferClarity', pts: 5, test: h => /\$|pricing|package|membership|per month|\/mo\b|fee|investment/i.test(h), issue: 'Missing offer or pricing clarity' },
  { key: 'hasCompleteContactInfo', pts: 8, test: h => (/(<form[^>]contact|contact\sform|get\sin\stouch)/i.test(h) && /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(h) && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/.test(h)), issue: 'Missing complete contact info (phone, email, and form)' },
  { key: 'hasSchemaMarkup', pts: 6, test: h => /application\/ld\+json/i.test(h), issue: 'Missing Schema.org structured data' },
  { key: 'hasFaqOrObjectionHandling', pts: 5, test: h => /faq|frequently asked|common questions|accordion|x-data=/i.test(h), issue: 'Missing FAQ or objection-handling section' },
  { key: 'hasStickyMobileCta', pts: 6, test: h => /sticky|fixed bottom|mobile sticky|bottom booking|small screens only/i.test(h), issue: 'Missing mobile sticky CTA treatment' },
  { key: 'hasTailwind', pts: 4, test: h => /tailwind/i.test(h), issue: 'Missing TwCSS' },
  { key: 'hasFooter', pts: 3, test: h => /<footer[\s>]/i.test(h), issue: 'Missing footer element' },
  { key: 'hasFocusStyles', pts: 3, test: h => /focus:|focus-visible:|:focus\b|:focus-visible\b/i.test(h), issue: 'Missing visible keyboard focus styles' },
  { key: 'minLength', pts: 5, test: h => h.length > 4500, issue: 'Content too short (under 4500 chars)' },
  { key: 'lowImageCount', pts: 4, test: h => (h.match(/<img/gi) || []).length < 10, issue: 'Too many images, potentially impacting performance' },
  { key: 'minimalInlineStyles', pts: 4, test: h => ((h.match(/style=["'][^"']+["']/gi) || []).length < 10 && (h.match(/<style>/gi) || []).length <= 1), issue: 'Excessive inline styles or multiple style blocks' },
];

const GRADES = [
  { grade: 'A', min: 80 },
  { grade: 'B', min: 65 },
  { grade: 'C', min: 50 },
  { grade: 'D', min: 35 },
  { grade: 'F', min: 0 },
];

export function scoreGeneratedSite(html, businessInfo = {}, options = {}) {
  const h = String(html || '');
  let score = 0;
  const criteria = {};
  const issues = [];
  const minReadyScore = Number(options.minReadyScore || process.env.SITE_BUILDER_MIN_SEND_SCORE || 72);
  const minExcellentScore = Number(options.minExcellentScore || process.env.SITE_BUILDER_TARGET_SCORE || 88);

  for (const c of CRITERIA) {
    const earned = c.test(h) ? c.pts : 0;
    criteria[c.key] = earned;
    score += earned;
    if (!earned) issues.push(c.issue);
  }

  const maxScore = CRITERIA.reduce((s, c) => s + c.pts, 0);
  const scorePct = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(1)) : 0;
  const { grade } = GRADES.find(g => scorePct >= g.min) || GRADES[GRADES.length - 1];

  const summaryIssues = issues.slice(0, 6);
  const readyToSend = scorePct >= minReadyScore;
  const recommendedAction = scorePct >= minExcellentScore ? 'ship' : readyToSend ? 'review_then_send' : 'revise_before_send';

  return {
    score,
    maxScore,
    scorePct,
    grade,
    criteria,
    issues,
    summaryIssues,
    readyToSend,
    recommendedAction,
    minReadyScore,
    minExcellentScore,
  };
}

export function scoreSummary(result) {
  const { score, maxScore, scorePct, grade, issues, readyToSend, recommendedAction } = result;
  const issueNote = issues.length ? ` — ${issues.slice(0, 2).join(', ')}${issues