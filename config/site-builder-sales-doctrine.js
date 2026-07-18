/**
 * SYNOPSIS: Universal Site Builder sales doctrine — continuous context for every
 * industry. Sites must look good AND create financial activity; midwifery/wellness
 * packs are examples, not the product scope.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

/**
 * Founder law (2026-07-14, restated): Site Builder is not a pretty-page factory.
 * It sells — for dentists, contractors, attorneys, advisors, clinics, shops, and
 * yes midwives. Beauty without a path to money is ego decoration. Both matter.
 *
 * Continuous knowledge (carry into every build / prompt / layout):
 * - START FROM THE CLIENT — unanswered questions the buyer has before they hire
 * - PAS (Problem → Agitate → Solution) — pain-aware visitors; Dan Kennedy / Sugarman lineage
 * - AIDA (Attention → Interest → Desire → Action) — colder / aspirational visitors
 * - Awareness stages (Eugene Schwartz) — match path to how decided the visitor already is
 * - Hormozi Value Equation — raise dream outcome × certainty; shrink time delay × effort
 * - Reluctant-buyer friction — name the objections that stop the sale, then dissolve them
 * - Multi-path visitor state — do NOT force one sequence for everyone
 *
 * Real-estate illustration (founder, 2026-07-14): one door for IDX home search /
 * schedule a showing; another for “why this agent / how to pick”; always a consult CTA.
 * Provider proof only from real facts (volume, list-to-sell, years, negotiation) — never invented.
 */

export const SITE_BUILDER_SALES_DOCTRINE = {
  version: '2026-07-14c',
  law: 'A website must create financial activity for the business — book, call, buy, inquire — while also looking like a premium custom site. Pretty alone is failure. Convert alone with an ugly site is also failure. Both.',
  scope: 'Every industry Site Builder serves. Midwifery and wellness are reference examples only — not the default market.',
  startFrom: 'Unanswered questions the client (buyer) still has for this industry — interview questions, fears, “why you?” proof. Build paths from those, not from what the business wants to brag about.',
  mustAnswerBeforeShip: [
    'What unanswered questions does the buyer still have?',
    'Who is the buyer?',
    'Why do they seek this category now?',
    'What do they fear?',
    'What benefits do they actually buy?',
    'What stops a reluctant buyer?',
    'What is the primary money action (book / call / buy / form / schedule showing)?',
    'What visitor states need their own door (searching / decided on category / picking a provider / secondary offer)?',
  ],
  visitorPaths: {
    searching: 'Already in-market and doing the work (e.g. IDX home search, browsing inventory) — give them the tool + schedule showing / consult',
    decided: 'Already wants the category — sell WHO / WHY THIS PROVIDER first (proof + interview questions)',
    curious: 'Still weighing the category or how to choose — sell WHY THIS CATEGORY / HOW TO PICK, then book or why this provider',
    secondary: 'Here for a real secondary offer — combine why the offer + why this provider; skippable sections, no forced hierarchy',
  },
  frameworks: [
    { id: 'pas', name: 'PAS', use: 'Problem → Agitate → Solution for problem-aware sections' },
    { id: 'aida', name: 'AIDA', use: 'Attention → Interest → Desire → Action for cold / aspirational arcs' },
    { id: 'schwartz', name: 'Schwartz awareness', use: 'Match copy depth to how aware the visitor already is' },
    { id: 'hormozi_value', name: 'Hormozi Value Equation', use: 'Increase outcome × likelihood; decrease time × effort on the page' },
  ],
  nonNegotiables: [
    'Never invent credentials, prices, ratings, or testimonials',
    'Primary CTA must be a real money/booking path when one exists',
    'Hero offers path doors by visitor state — not one forced funnel',
    'Secondary offerings only appear when scrape/profile evidence supports them',
    'Do not default copy or services to midwifery/wellness unless the business is that',
  ],
};

/**
 * Plain-text block injected into every Site Builder AI generation / repair prompt.
 */
export function renderSalesDoctrineForPrompt(info = {}) {
  const d = SITE_BUILDER_SALES_DOCTRINE;
  const industry = info.industry || info.category || 'this business category';
  const name = info.businessName || 'this business';
  return `
SITE BUILDER SALES DOCTRINE (CONTINUOUS — ALL INDUSTRIES, not wellness-only):
Law: ${d.law}
Scope: ${d.scope}
This build is for: ${name} (${industry}). Apply doctrine to THIS business — do not write midwife/spa copy unless the profile is midwifery/wellness.

Before shipping copy, answer: ${d.mustAnswerBeforeShip.join(' | ')}

Start from: ${d.startFrom}

Visitor-state paths (offer doors; do not force one sequence):
- Searching / in-market: ${d.visitorPaths.searching}
- Decided: ${d.visitorPaths.decided}
- Curious / how to choose: ${d.visitorPaths.curious}
- Secondary offer (only if real): ${d.visitorPaths.secondary}

Real-estate pattern (adapt to THIS industry): IDX/search path · why this agent + interview questions · schedule showing/consult. Never invent stats.

Frameworks to apply where they fit: ${d.frameworks.map((f) => `${f.name} (${f.use})`).join('; ')}.

Non-negotiables: ${d.nonNegotiables.join('; ')}.

Financial activity: every major section should make booking/calling/buying feel like the obvious next step — not a brochure ending in "learn more" forever.
`.trim();
}

/**
 * Infer a universal sales brief from scraped profile when no industry pack matches.
 * Industry packs specialize this; they do not replace it.
 */
export function buildUniversalSalesBrief(info = {}) {
  const name = info.businessName || 'This business';
  const industry = String(info.industry || info.category || 'service').trim() || 'service';
  const categoryLabel = industry.replace(/[_-]+/g, ' ');
  const services = (info.services || []).map(String).filter(Boolean);
  const about = String(info.about || info.description || info.uniqueValue || '').slice(0, 400);
  const pains = (info.painPoints || []).slice(0, 4);
  const secondary = inferSecondaryOffer(info);

  return {
    id: 'universal',
    industry: categoryLabel,
    clientWho: info.targetAudience
      || `People actively looking for ${categoryLabel} who need a clear reason to choose ${name} and a simple next step.`,
    whySeek: services.length
      ? services.slice(0, 4).map((s) => `Looking for ${s}`)
      : [`Need a trusted ${categoryLabel} provider`, 'Want clarity on process, price path, and next step'],
    fears: pains.length
      ? pains
      : [
          'Picking the wrong provider wastes money and time',
          'Hard to tell who is credible from a weak website',
          'Unclear pricing / booking friction',
        ],
    benefits: [
      info.uniqueValue || `Clear reason to hire ${name}`,
      'Straightforward path to book or inquire',
      about ? about.slice(0, 140) : `Local ${categoryLabel} care with a human next step`,
    ].filter(Boolean),
    reluctantBuyer: [
      'Need proof before committing money or time',
      'Partner / family skepticism',
      'Unclear what happens after they click Book',
    ],
    categorySale: {
      eyebrow: 'If you are still exploring',
      title: `Why ${categoryLabel}`,
      blurb: `Curious about ${categoryLabel}? What to look for before you hire.`,
      cta: `Curious about ${categoryLabel}?`,
      anchor: 'why-category',
      nextAfter: `If that fits — meet ${name} next, or book a consult.`,
      sections: [
        {
          heading: 'The real decision',
          body: `People do not buy ${categoryLabel} for a logo. They buy an outcome, less risk, and a provider they trust to follow through.`,
        },
        {
          heading: 'What “good enough” means',
          body: 'Honest sales names how quality is judged, what the process looks like, and how to spot a bad fit before you pay.',
        },
        {
          heading: 'Why people seek this out',
          body: about || `A clear process, real proof, and a booking path that does not feel like homework.`,
        },
      ],
    },
    providerSale: {
      eyebrow: 'If you already know what you want',
      title: `Why ${name}`,
      blurb: `Already decided on ${categoryLabel}? Here is who you would hire — and why.`,
      cta: `Why ${name}`,
      anchor: 'why-this-provider',
      promptQuestions: [
        'What credentials or results can they prove?',
        'How do they work with people like you?',
        'What happens after you book?',
        'What do real clients say in their own words?',
      ],
    },
    secondarySale: secondary,
    heroPrimaryCta: { label: `Why ${name}`, href: '#why-this-provider', path: 'decided' },
    heroSecondaryCta: { label: `Curious about ${categoryLabel}?`, href: '#why-category', path: 'curious' },
    heroTertiaryCta: secondary
      ? { label: secondary.cta, href: `#${secondary.anchor}`, path: 'secondary' }
      : null,
    bookCta: { label: 'Book a free consult', href: null },
    heroLead: `Already know you need ${categoryLabel}? Meet who you would hire. Still deciding? Start with why this category. ${secondary ? 'Here for something else they offer? That door is open — skip what is not for you.' : ''}`.trim(),
  };
}

function inferSecondaryOffer(info = {}) {
  const hay = [
    info.about,
    info.description,
    info.uniqueValue,
    ...(info.services || []),
    ...(info.keywords || []),
  ].filter(Boolean).join(' ');
  if (!hay) return null;
  // Generic secondary doors — only when evidence exists (not wellness-forced)
  if (/sound|energy heal|reiki|acutonic|herbal/i.test(hay) && /midwif|birth|doula/i.test(hay)) {
    return {
      eyebrow: 'Another path',
      title: 'Energy & wellness',
      blurb: 'Here for sound, energy, or herbal work — not the primary category.',
      cta: 'Energy & wellness',
      anchor: 'secondary-offer',
      combineCategoryAndProvider: true,
      skippable: true,
    };
  }
  if (/consulting|training|workshop|retainer|membership/i.test(hay) && (info.services || []).length >= 2) {
    return {
      eyebrow: 'Another path',
      title: 'Other ways to work together',
      blurb: 'Here for a different offer than the main service.',
      cta: 'Other offers',
      anchor: 'secondary-offer',
      combineCategoryAndProvider: true,
      skippable: true,
    };
  }
  return null;
}

/**
 * Resolve the sales brief for a build: industry pack specializes; else universal.
 */
export function resolveSalesBrief(info = {}, industryPack = null) {
  if (industryPack) {
    return {
      ...industryPack,
      source: 'industry_pack',
      doctrineVersion: SITE_BUILDER_SALES_DOCTRINE.version,
    };
  }
  return {
    ...buildUniversalSalesBrief(info),
    source: 'universal',
    doctrineVersion: SITE_BUILDER_SALES_DOCTRINE.version,
  };
}
