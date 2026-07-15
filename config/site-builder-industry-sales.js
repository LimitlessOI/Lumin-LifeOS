/**
 * SYNOPSIS: Optional industry specializations of the universal Site Builder sales
 * doctrine (`config/site-builder-sales-doctrine.js`). Packs deepen buyer psychology
 * for a vertical — they are NOT the product scope. Midwifery is one example among
 * many industries Site Builder must sell for.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

import { SITE_BUILDER_SALES_DOCTRINE } from './site-builder-sales-doctrine.js';

/**
 * Multi-path sales rule (founder, 2026-07-14) — UNIVERSAL, illustrated by midwifery:
 * Offer paths that match visitor state — do not force a sequence.
 * Example (midwifery only as illustration):
 *  - Already want home birth → why this midwife (WHO)
 *  - Curious about home birth → why home birth → then book or why midwife
 *  - Energy / wellness → combined why energy work + why this practitioner (skippable parts)
 * Same pattern applies to dentist / contractor / attorney / advisor / etc.
 * Doctrine SSOT: SITE_BUILDER_SALES_DOCTRINE v${SITE_BUILDER_SALES_DOCTRINE.version}
 */
void SITE_BUILDER_SALES_DOCTRINE;

export const INDUSTRY_SALES_PACKS = {
  midwifery_home_birth: {
    id: 'midwifery_home_birth',
    match: /midwif|home\s*birth|birth\s*center|doula|perinatal|prenatal|postpartum|obstetric|shy\s*to\s*shine|energy\s*heal|sound\s*heal|herbal|acutonic|reiki/i,
    clientWho: 'Pregnant people (and their partners) who want physiological birth with continuous, relationship-based care — and/or people seeking holistic energy, sound, and herbal wellness from the same trusted practitioner.',
    whySeek: [
      'Want continuity — one known midwife, not a rotating hospital shift',
      'Want to avoid the cascade of interventions unless truly needed',
      'Want birth at home or in a calm setting they choose',
      'Want a partner and family included, not sidelined',
    ],
    fears: [
      'Will we be safe if something changes mid-labor?',
      'What if we need the hospital — will transfer be clear and fast?',
      'Will family or doctors judge this choice?',
      'Is this legal / covered / actually available where we live?',
    ],
    benefits: [
      'Screening for who home birth is (and is not) appropriate for',
      'Continuous presence and decision-making with you, not to you',
      'A written plan for monitoring, red flags, and hospital transfer',
      'Prenatal + birth + postpartum as one relationship, not three departments',
    ],
    reluctantBuyer: [
      'Partner or parent is scared and needs the safety plan in plain language',
      'Insurance / payment path is unclear until someone explains it',
      'Horror stories online without context of risk screening',
      'First-time parents who need permission to ask hard questions',
    ],
    categorySale: {
      eyebrow: 'If you are still exploring',
      title: 'Why home birth',
      blurb: 'Curious about home birth? Benefits, safety questions, and who it is for.',
      cta: 'Curious about home birth?',
      anchor: 'why-home-birth',
      nextAfter: 'If that sounds like your birth — meet this midwife next, or book a consult.',
      sections: [
        {
          heading: 'The fear underneath',
          body: 'People do not hire a home-birth midwife because birth is trendy. They hire because they want their baby and their body safe — and a care model that treats them as the decision-maker.',
        },
        {
          heading: 'What “safe enough” means',
          body: 'Screened, low-risk pregnancies with a qualified midwife include ongoing assessment, clear transfer criteria, and hospital backup. Honest sales is not “zero risk.” It is “here is how risk is watched.”',
        },
        {
          heading: 'Why families seek this out',
          body: 'Continuity of care. Fewer unnecessary interventions. Birth in a place that feels like theirs. A partner who is included. Postpartum follow-through from the same person who caught the baby.',
        },
      ],
    },
    providerSale: {
      eyebrow: 'If you already know you want home birth',
      title: 'Why this midwife',
      blurb: 'Already decided on home birth? Here is who you would hire — and why.',
      cta: 'Why this midwife',
      anchor: 'why-this-midwife',
      promptQuestions: [
        'What credentials and licenses do they hold (e.g. CPM)?',
        'How many births / years of continuity care?',
        'What is their transfer philosophy and backup hospital relationship?',
        'What makes their prenatal rhythm different from clinic conveyor-belt care?',
        'What do real clients say — in their own words?',
      ],
    },
    /**
     * Third path: energy / wellness. Category + provider can live on ONE path.
     * Sections are skippable — jump links, no forced hierarchy.
     */
    wellnessSale: {
      eyebrow: 'Energy work & wellness',
      title: 'Sound, energy & herbal healing',
      blurb: 'Here for sound healing, energy work, or herbal wellness — not birth care.',
      cta: 'Energy & wellness',
      anchor: 'energy-wellness',
      combineCategoryAndProvider: true,
      skippable: true,
      jumpLinks: [
        { label: 'Why energy work', href: '#why-energy-work' },
        { label: 'Sound + Acutonics', href: '#sound-acutonics' },
        { label: 'Why this practitioner', href: '#why-energy-practitioner' },
        { label: 'Book wellness', href: null },
      ],
      whyEnergy: {
        heading: 'Why energy work & sound healing',
        body: 'People seek sound and energy work when stress is stuck in the body, sleep is off, or they want nervous-system reset without another clinical treadmill. Vibrational tools (tuning forks, bowls, Reiki-informed sound) are for regulation, release, and coming back to yourself.',
        bullets: [
          'Nervous-system calm when talk therapy or rest alone is not enough',
          'A body-based reset after birth, burnout, or long stress',
          'Curious about sound healing, Acutonics, or Reiki-informed sessions',
        ],
      },
      modalities: {
        heading: 'Sound healing + Acutonics',
        body: 'This practice integrates sound healing with Acutonics (acu-point tuning-fork therapy), singing bowls, and Reiki-informed sound — energetic work that can meet people where acupuncture-style point work and vibration meet.',
        bullets: [
          'Acutonics tuning forks on and around the body',
          'Singing bowls and Reiki-infused sound therapy',
          'Chakra balancing as part of an energy session',
        ],
      },
      whyPractitioner: {
        heading: 'Why this practitioner',
        body: 'Same person families trust for midwifery continuity — with deep training across herbalism, yoga, Reiki, sound healing, and Acutonics. You are not handed off to a stranger for the energetic half of your care.',
        // Prefer practice-site facts; founder may enrich titles in editor.
        siteFacts: [
          'Certified Professional Midwife (CPM)',
          'Two comprehensive herbalism courses',
          '200-hour yoga teacher certification',
          'Trained in Reiki, sound healing, chakra balancing, and Acutonics',
        ],
      },
    },
    heroPrimaryCta: { label: 'Why this midwife', href: '#why-this-midwife', path: 'decided' },
    heroSecondaryCta: { label: 'Curious about home birth?', href: '#why-home-birth', path: 'curious' },
    heroTertiaryCta: { label: 'Energy & wellness', href: '#energy-wellness', path: 'wellness' },
    bookCta: { label: 'Book a free consult', href: null },
    heroLead: 'Already know you want home birth? Meet who you would hire. Curious about birth? Start there. Here for sound, energy, or herbal wellness? That path is open too — skip what is not for you.',
  },

  /**
   * Real estate agent — start from buyer unanswered questions.
   * Paths: search homes (IDX) · why this agent / how to pick · schedule showing/consult.
   * Provider proof only from scraped/verified facts (volume, list-to-sell, years, negotiation).
   */
  real_estate_agent: {
    id: 'real_estate_agent',
    match: /real\s*estate|realtor|realty|broker|listing\s*agent|buyer'?s?\s*agent|\bIDX\b|mls\b|home\s*search|schedule\s*a\s*showing/i,
    clientWho: 'Buyers and sellers who need a trusted local agent — some are already searching homes; others are interviewing agents and still deciding who to hire.',
    unansweredClientQuestions: [
      'How do I search homes without getting stuck in a dead portal?',
      'How do I pick the right agent — what should I ask in an interview?',
      'Why this agent over the next one on Zillow?',
      'Can we schedule a showing or a consult without a hard pitch?',
      'What have they actually sold — volume, list-to-sell, years in market?',
      'Are they a strong negotiator when offers get messy?',
    ],
    whySeek: [
      'Want to see real inventory and book showings without friction',
      'Want an agent who closes deals, not just collects leads',
      'Want clear answers when interviewing multiple agents',
      'Want negotiation strength when multiple offers hit',
    ],
    fears: [
      'Picking a weak agent who under-negotiates or disappears',
      'Overpaying or missing the right house while stuck in process',
      'Getting pressured into a listing or buyer agreement too fast',
      'Stats and “#1” claims that are marketing, not MLS truth',
    ],
    benefits: [
      'Live home search (IDX) when the practice has it — browse, then book a showing',
      'A clear “why this agent” path with interview questions answered',
      'Straightforward schedule-a-showing / consultation CTA',
      'Proof from real track record when the scrape/profile provides it',
    ],
    reluctantBuyer: [
      'Already talking to another agent and need a reason to switch',
      'Spouse wants “the popular name” without comparing skill',
      'First-time buyers who do not know what good representation looks like',
      'Sellers scared of overpricing or sitting on market',
    ],
    categorySale: {
      eyebrow: 'If you are choosing an agent',
      title: 'How to pick the right agent',
      blurb: 'Interviewing agents? Start with the questions that separate marketers from closers.',
      cta: 'How to pick an agent',
      anchor: 'why-category',
      nextAfter: 'When you know what “good” looks like — meet this agent, search homes, or schedule a showing.',
      sections: [
        {
          heading: 'Unanswered questions first',
          body: 'Buyers and sellers do not hire a logo. They hire someone who can find the house, win the negotiation, and tell the truth about market reality. Start from the questions you still have unanswered.',
        },
        {
          heading: 'What to ask in an agent interview',
          body: 'Ask about recent closings, list-to-sell discipline, years in market, negotiation examples, and how they communicate during escrow — not just who has the biggest billboard.',
        },
        {
          heading: 'Search vs hire',
          body: 'Some visitors need the IDX today. Others need to choose who represents them. Both doors should exist — neither should trap the other.',
        },
      ],
    },
    providerSale: {
      eyebrow: 'If you are choosing who represents you',
      title: 'Why this agent',
      blurb: 'Already shopping agents? Here is why this one — and the questions to bring.',
      cta: 'Why this agent',
      anchor: 'why-this-provider',
      promptQuestions: [
        'How many homes have you closed — recently and over your career?',
        'What is your list-to-sell ratio / how do your listings perform vs MLS?',
        'How long have you been practicing at high volume in this market?',
        'Walk me through a hard negotiation you won for a client.',
        'How do you communicate during showings, offers, and escrow?',
        'Buyer or seller — what is your process in the first 7 days?',
      ],
    },
    searchPath: {
      eyebrow: 'If you are already looking',
      title: 'Search homes',
      blurb: 'Browse live listings, then schedule a showing when something fits.',
      cta: 'Search homes',
      anchor: 'search-homes',
      actionLabel: 'Open home search',
      showingLabel: 'Schedule a showing',
    },
    heroPrimaryCta: { label: 'Why this agent', href: '#why-this-provider', path: 'decided' },
    heroSecondaryCta: { label: 'How to pick an agent', href: '#why-category', path: 'curious' },
    heroTertiaryCta: { label: 'Search homes', href: '#search-homes', path: 'searching' },
    bookCta: { label: 'Schedule a consultation', href: null },
    heroLead: 'Already searching? Open the listing path and schedule a showing. Interviewing agents? Start with why this agent — and the questions buyers actually ask. Not sure how to choose? That door is here too.',
  },
};

export function matchIndustrySalesPack(info = {}) {
  const hay = [
    info.industry,
    info.tagline,
    info.businessName,
    info.uniqueValue,
    info.about,
    info.description,
    ...(info.services || []),
    ...(info.keywords || []),
  ].filter(Boolean).join(' ');
  for (const pack of Object.values(INDUSTRY_SALES_PACKS)) {
    if (pack.match.test(hay)) return pack;
  }
  return null;
}

/**
 * Detect whether this business should surface the energy/wellness third path.
 */
export function practiceOffersEnergyWellness(info = {}, pack = null) {
  if (pack?.wellnessSale && pack.id === 'midwifery_home_birth') {
    const hay = [
      info.about,
      info.description,
      info.uniqueValue,
      ...(info.services || []),
      ...(info.keywords || []),
    ].filter(Boolean).join(' ');
    // Always offer for matched midwifery+wellness brands, or when scrape shows modalities
    if (/sound|energy|heal|herb|reiki|acutonic|yoga|wellness/i.test(hay)) return true;
    if (/shy\s*to\s*shine|hopkins/i.test(`${info.businessName || ''}`)) return true;
  }
  return Boolean(pack?.wellnessSale && /energy|sound|herb|wellness/i.test(JSON.stringify(info.services || [])));
}

/**
 * Build provider-sale bullets from real scraped facts only — never invent credentials.
 */
export function buildProviderWhyBullets(info = {}, pack = null) {
  const bullets = [];
  const name = info.businessName || 'This business';
  const blob = `${info.businessName || ''} ${info.tagline || ''} ${info.about || ''} ${info.uniqueValue || ''} ${(info.services || []).join(' ')}`;
  if (info.uniqueValue) bullets.push(String(info.uniqueValue).slice(0, 180));
  if (/\bCPM\b|certified professional midwife/i.test(blob)) {
    bullets.push('Certified Professional Midwife (CPM) — ask about license, scope, and local regulations in consult.');
  }
  if (/herbal/i.test(blob)) bullets.push('Herbalism training woven into whole-person care — ask which courses and how herbs are used with you.');
  if (/yoga/i.test(blob)) bullets.push('200-hour yoga teacher path — movement and breath as part of healing, not an add-on brochure.');
  if (/reiki|sound|acutonic/i.test(blob)) {
    bullets.push('Trained in Reiki, sound healing, and Acutonics — energy work from the same practitioner, not a referral lottery.');
  }
  // Real estate — only surface claims present in scrape/profile (never invent volume/#1)
  if (pack?.id === 'real_estate_agent' || /real\s*estate|realtor|realty/i.test(blob)) {
    if (/hundreds?\s+of\s+homes|closed\s+\d+|transactions?/i.test(blob)) {
      bullets.push('Proven closing volume — ask for recent transaction count and comps in consult.');
    }
    if (/list[- ]?to[- ]?sell|highest\s+list|mls/i.test(blob)) {
      bullets.push('List-to-sell / MLS performance is part of the pitch — verify the numbers before you hire.');
    }
    if (/20(0\d|1\d|2\d)|since\s+20\d\d|years?\s+in/i.test(blob)) {
      bullets.push('Long tenure in this market — ask how that experience changes negotiation and pricing.');
    }
    if (/negotiat/i.test(blob)) {
      bullets.push('Positions as a strong negotiator — ask for a real multiple-offer or concession story.');
    }
    if (/high\s+volume|top\s+producer|volume/i.test(blob)) {
      bullets.push('High-volume practice — ask what that means for response time and bandwidth for you.');
    }
  }
  if (info.location) {
    bullets.push(pack?.id === 'real_estate_agent'
      ? `Serves buyers and sellers in and around ${info.location}.`
      : `Serves clients in and around ${info.location}.`);
  }
  const services = (info.services || []).slice(0, 4);
  if (services.length) bullets.push(`Offers include: ${services.join(', ')}.`);
  if (info.verifiedData?.rating) {
    const rc = info.verifiedData.reviewCount ? ` across ${info.verifiedData.reviewCount} reviews` : '';
    bullets.push(`Public rating ${info.verifiedData.rating}★${rc} — read the sources, then decide.`);
  }
  if (info.assetData?.social?.instagram?.followers) {
    bullets.push(`Active presence @${info.assetData.social.instagram.username} — see the work they already show publicly.`);
  }
  if (!bullets.length) {
    bullets.push(`In consult, ask what makes ${name} the right hire — proof, process, and how they show up when it gets hard.`);
  }
  if (pack?.providerSale?.promptQuestions?.length && bullets.length < 4) {
    bullets.push('Bring your hardest interview questions — a strong hire welcomes them.');
  }
  if (pack?.unansweredClientQuestions?.length && bullets.length < 5) {
    bullets.push(`Start from what you still need answered: ${pack.unansweredClientQuestions[0]}`);
  }
  return bullets.slice(0, 6);
}

/**
 * Wellness-path practitioner bullets: pack siteFacts first, then scrape enrichment.
 */
export function buildWellnessWhyBullets(info = {}, pack = null) {
  const fromPack = pack?.wellnessSale?.whyPractitioner?.siteFacts || [];
  const extra = [];
  const blob = `${info.about || ''} ${info.uniqueValue || ''} ${(info.services || []).join(' ')}`;
  if (/master\s+herb|herbalism courses/i.test(blob) && !fromPack.some((f) => /herb/i.test(f))) {
    extra.push('Herbalism training — ask how plant medicine is used in your plan.');
  }
  if (info.location) extra.push(`Based in ${info.location}.`);
  return [...fromPack, ...extra].slice(0, 6);
}
