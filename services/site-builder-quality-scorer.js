/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Pure-function HTML quality scorer — no DOM, no dependencies.
 * Evaluates generated site HTML for conversion readiness (0-100 score).
 */

const CRITERIA = [
  { key: 'hasDoctype',        pts: 10, test: h => /<!DOCTYPE\s+html/i.test(h),                                issue: 'Missing DOCTYPE declaration' },
  { key: 'hasMobileViewport', pts: 10, test: h => /name=["']viewport["']/i.test(h),                          issue: 'Missing mobile viewport meta tag' },
  { key: 'hasH1',             pts:  5, test: h => /<h1[\s>]/i.test(h),                                        issue: 'Missing H1 heading' },
  { key: 'hasH2',             pts:  5, test: h => /<h2[\s>]/i.test(h),                                        issue: 'Missing H2 heading' },
  { key: 'hasCTA',            pts: 10, test: h => /book|schedule|contact us|call us|get started|sign up|free trial/i.test(h), issue: 'Missing clear call-to-action text' },
  { key: 'hasTestimonials',   pts: 10, test: h => /testimonial|review|said|quote/i.test(h),                   issue: 'Missing testimonials or reviews' },
  { key: 'hasPricing',        pts:  5, test: h => /\$|pricing|per month|\/mo\b|fee|cost/i.test(h),            issue: 'Missing pricing information' },
  { key: 'hasContactInfo',    pts: 10, test: h => /\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4}|@[a-z0-9.-]+\.[a-z]{2,}/i.test(h), issue: 'Missing phone number or email address' },
  { key: 'hasSchemaMarkup',   pts: 10, test: h => /application\/ld\+json/i.test(h),                           issue: 'Missing Schema.org structured data' },
  { key: 'hasImages',         pts:  5, test: h => /<img[\s>]/i.test(h),                                       issue: 'Missing images' },
  { key: 'minLength',         pts: 10, test: h => h.length > 5000,                                            issue: 'Content too short (under 5000 chars)' },
  { key: 'hasTailwind',       pts:  5, test: h => /tailwind/i.test(h),                                        issue: 'Missing Tailwind CSS' },
  { key: 'hasFooter',         pts:  5, test: h => /<footer[\s>]/i.test(h),                                    issue: 'Missing footer element' },
];

const GRADES = [
  { grade: 'A', min: 90 },
  { grade: 'B', min: 75 },
  { grade: 'C', min: 60 },
  { grade: 'D', min: 45 },
  { grade: 'F', min:  0 },
];

export function scoreGeneratedSite(html, businessInfo = {}) {
  const h = String(html || '');
  let score = 0;
  const criteria = {};
  const issues = [];

  for (const c of CRITERIA) {
    const earned = c.test(h) ? c.pts : 0;
    criteria[c.key] = earned;
    score += earned;
    if (!earned) issues.push(c.issue);
  }

  const maxScore = CRITERIA.reduce((s, c) => s + c.pts, 0);
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const { grade } = GRADES.find(g => pct >= g.min) || GRADES[GRADES.length - 1];

  return { score, maxScore, grade, criteria, issues, readyToSend: pct >= 60 };
}

export function scoreSummary(result) {
  const { score, maxScore, grade, issues, readyToSend } = result;
  const issueNote = issues.length ? ` — ${issues.slice(0, 2).join(', ')}${issues.length > 2 ? ` (+${issues.length - 2} more)` : ''}.` : '.';
  const sendNote = readyToSend ? ' Ready to send.' : ' Not ready to send.';
  return `Score: ${score}/${maxScore} (${grade})${issueNote}${sendNote}`;
}
