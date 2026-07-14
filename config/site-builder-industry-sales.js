/**
 * SYNOPSIS: Industry buyer-psychology packs for Site Builder — who the client is,
 * fears, reluctant-buyer friction, and the dual-sale structure (category + this provider)
 * before any layout is filled. Midwifery is the reference pack.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

/**
 * Dual-sale rule (founder, 2026-07-14):
 * 1) Sell the CATEGORY (why home birth / why this kind of care)
 * 2) Sell THIS PROVIDER (why hire this midwife / practice)
 * Never collapse those into one generic wellness pitch.
 */

export const INDUSTRY_SALES_PACKS = {
  midwifery_home_birth: {
    id: 'midwifery_home_birth',
    match: /midwif|home\s*birth|birth\s*center|doula|perinatal|prenatal|postpartum|obstetric/i,
    clientWho: 'Pregnant people (and their partners) who want physiological birth with continuous, relationship-based care — often after a hospital experience, or because autonomy and intimacy matter as much as clinical safety.',
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
      eyebrow: 'First sale',
      title: 'Why home birth',
      blurb: 'Safety, benefits, and who it is for — before you pick a midwife.',
      cta: 'Why home birth',
      anchor: 'why-home-birth',
      sections: [
        {
          heading: 'The fear underneath every consult',
          body: 'People do not hire a home-birth midwife because birth is trendy. They hire because they want their baby and their body safe — and they want a care model that treats them as the decision-maker. Safety questions belong on the homepage, not buried in FAQ.',
        },
        {
          heading: 'What “safe enough” actually means',
          body: 'Home birth for screened, low-risk pregnancies with a qualified midwife includes ongoing assessment, clear transfer criteria, and a plan for hospital backup. The honest sales move is not “zero risk.” It is “here is how risk is watched, and here is what we do if the picture changes.”',
        },
        {
          heading: 'Why families seek this out',
          body: 'Continuity of care. Fewer unnecessary interventions. Birth in a place that feels like theirs. A partner who is included. Postpartum follow-through from the same person who caught the baby.',
        },
      ],
    },
    providerSale: {
      eyebrow: 'Second sale',
      title: 'Why this midwife',
      blurb: 'Credentials, presence, and the specific reasons to hire this practice.',
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
    heroPrimaryCta: { label: 'Why home birth', href: '#why-home-birth' },
    heroSecondaryCta: { label: 'Why this midwife', href: '#why-this-midwife' },
    bookCta: { label: 'Book a free consult', href: null },
  },
};

export function matchIndustrySalesPack(info = {}) {
  const hay = [
    info.industry,
    info.tagline,
    info.businessName,
    info.uniqueValue,
    ...(info.services || []),
    ...(info.keywords || []),
  ].filter(Boolean).join(' ');
  for (const pack of Object.values(INDUSTRY_SALES_PACKS)) {
    if (pack.match.test(hay)) return pack;
  }
  return null;
}

/**
 * Build provider-sale bullets from real scraped facts only — never invent credentials.
 */
export function buildProviderWhyBullets(info = {}, pack = null) {
  const bullets = [];
  const name = info.businessName || 'This practice';
  if (info.uniqueValue) bullets.push(String(info.uniqueValue).slice(0, 180));
  if (/\bCPM\b|certified professional midwife/i.test(`${info.businessName} ${info.tagline} ${info.about || ''}`)) {
    bullets.push('Certified Professional Midwife (CPM) pathway — ask about license, scope, and local regulations in consult.');
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
    bullets.push(`In consult, ask what makes ${name} the right midwife for your specific pregnancy — credentials, transfer plan, and how they show up prenatally.`);
  }
  if (pack?.providerSale?.promptQuestions?.length && bullets.length < 3) {
    bullets.push('Bring your hardest safety questions to the free consult — a good midwife welcomes them.');
  }
  return bullets.slice(0, 5);
}
