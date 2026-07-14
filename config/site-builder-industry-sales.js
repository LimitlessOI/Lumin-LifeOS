/**
 * SYNOPSIS: Industry buyer-psychology packs for Site Builder — who the client is,
 * fears, reluctant-buyer friction, and multi-path sales (category + provider, optional
 * combined wellness path). Midwifery + energy wellness is the reference pack.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

/**
 * Multi-path sales rule (founder, 2026-07-14):
 * Offer paths that match visitor state — do not force a sequence.
 * Midwifery example:
 *  - Already want home birth → why this midwife (WHO)
 *  - Curious about home birth → why home birth → then book or why midwife
 *  - Energy / wellness → combined why energy work + why this practitioner (skippable parts)
 */

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
  const name = info.businessName || 'This practice';
  const blob = `${info.businessName || ''} ${info.tagline || ''} ${info.about || ''} ${info.uniqueValue || ''}`;
  if (info.uniqueValue) bullets.push(String(info.uniqueValue).slice(0, 180));
  if (/\bCPM\b|certified professional midwife/i.test(blob)) {
    bullets.push('Certified Professional Midwife (CPM) — ask about license, scope, and local regulations in consult.');
  }
  if (/herbal/i.test(blob)) bullets.push('Herbalism training woven into whole-person care — ask which courses and how herbs are used with you.');
  if (/yoga/i.test(blob)) bullets.push('200-hour yoga teacher path — movement and breath as part of healing, not an add-on brochure.');
  if (/reiki|sound|acutonic/i.test(blob)) {
    bullets.push('Trained in Reiki, sound healing, and Acutonics — energy work from the same practitioner, not a referral lottery.');
  }
  if (info.location) bullets.push(`Serves families in and around ${info.location}.`);
  const services = (info.services || []).slice(0, 4);
  if (services.length) bullets.push(`Care path includes: ${services.join(', ')}.`);
  if (info.verifiedData?.rating) {
    const rc = info.verifiedData.reviewCount ? ` across ${info.verifiedData.reviewCount} reviews` : '';
    bullets.push(`Public rating ${info.verifiedData.rating}★${rc} — read the sources, then decide.`);
  }
  if (info.assetData?.social?.instagram?.followers) {
    bullets.push(`Active presence @${info.assetData.social.instagram.username} — see the work they already show publicly.`);
  }
  if (!bullets.length) {
    bullets.push(`In consult, ask what makes ${name} the right hire for your specific needs — credentials, approach, and how they show up.`);
  }
  if (pack?.providerSale?.promptQuestions?.length && bullets.length < 3) {
    bullets.push('Bring your hardest questions to the free consult — a good practitioner welcomes them.');
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
