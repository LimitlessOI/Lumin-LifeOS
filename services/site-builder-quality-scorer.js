/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Pure-function HTML quality scorer — no DOM, no dependencies.
 * Evaluates generated site HTML for conversion readiness with normalized percent scoring.
 */

const CRITERIA = [
  { key: 'hasDoctype',        pts:  8, test: h => /<!DOCTYPE\s+html/i.test(h), issue: 'Missing DOCTYPE declaration' },
  { key: 'hasMobileViewport', pts:  8, test: h => /name=["']viewport["']/i.test(h), issue: 'Missing mobile viewport meta tag' },
  { key: 'hasSingleH1',       pts:  6, test: h => (h.match(/<h1[\s>]/gi) || []).length === 1, issue: 'Expected exactly one H1 heading' },
  { key: 'hasMultipleH2s',    pts:  5, test: h => (h.match(/<h2[\s>]/gi) || []).length >= 3, issue: 'Missing enough H2 sections to structure the page' },
  { key: 'hasStrongCTA',      pts: 10, test: h => /(book|schedule|contact us|call us|get started|free consultation|free preview)/i.test(h), issue: 'Missing strong call-to-action language' },
  { key: 'repeatsCTA',        pts:  6, test: h => ((h.match(/book|schedule|contact us|call us|get started|free consultation|free preview/gi) || []).length >= 3), issue: 'CTA does not repeat enough through the page' },
  { key: 'hasProofSection',   pts:  8, test: h => /(testimonial|review|what clients value|why families choose|social proof|results)/i.test(h), issue: 'Missing a trust or proof section' },
  { key: 'hasOfferClarity',   pts:  6, test: h => /\$|pricing|package|membership|per month|\/mo\b|fee|investment/i.test(h), issue: 'Missing offer or pricing clarity' },
  { key: 'hasContactInfo',    pts:  8, test: h => /\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4}|@[a-z0-9.-]+\.[a-z]{2,}/i.test(h), issue: 'Missing phone number or email address' },
  { key: 'hasSchemaMarkup',   pts:  8, test: h => /application\/ld\+json/i.test(h), issue: 'Missing Schema.org structured data' },
  { key: 'hasFaqOrObjectionHandling', pts: 6, test: h => /faq|frequently asked|common questions|accordion|x-data=/i.test(h), issue: 'Missing FAQ or objection-handling section' },
  { key: 'hasStickyMobileCta', pts: 6, test: h => /sticky|fixed bottom|mobile sticky|bottom booking|small screens only/i.test(h), issue: 'Missing mobile sticky CTA treatment' },
  { key: 'hasTailwind',       pts:  5, test: h => /tailwind/i.test(h), issue: 'Missing Tailwind CSS' },
  { key: 'hasFooter',         pts:  4, test: h => /<footer[\s>]/i.test(h), issue: 'Missing footer element' },
  { key: 'hasFocusStyles',    pts:  4, test: h => /focus:|focus-visible:|:focus\b|:focus-visible\b/i.test(h), issue: 'Missing visible keyboard focus styles' },
  { key: 'minLength',         pts:  6, test: h => h.length > 4500, issue: 'Content too short (under 4500 chars)' },
];

const GRADES = [
  { grade: 'A', min: 90 },
  { grade: 'B', min: 75 },
  { grade: 'C', min: 60 },
  { grade: 'D', min: 45 },
  { grade: 'F', min:  0 },
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
  const recommendedAction =
    scorePct >= minExcellentScore ? 'ship' :
    scorePct >= minReadyScore ? 'review_then_send' :
    'revise_before_send';

  return {
    score,
    maxScore,
    scorePct,
    grade,
    criteria,
    issues,
    summaryIssues,
    readyToSend: scorePct >= minReadyScore,
    recommendedAction,
    minReadyScore,
    minExcellentScore,
  };
}

export function scoreSummary(result) {
  const { score, maxScore, scorePct, grade, issues, readyToSend, recommendedAction } = result;
  const issueNote = issues.length ? ` — ${issues.slice(0, 2).join(', ')}${issues.length > 2 ? ` (+${issues.length - 2} more)` : ''}.` : '.';
  const sendNote = readyToSend ? ' Ready to send.' : ' Not ready to send.';
  return `Score: ${score}/${maxScore} (${scorePct}%, ${grade}, ${recommendedAction})${issueNote}${sendNote}`;
}
