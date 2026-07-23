/**
 * SYNOPSIS: Go Vegas free network — multi-brand posting + recognition flywheel.
 * Cadence: Adam (human) heavy discussion; product accounts = specialty value personalities.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */

export const GO_VEGAS_GROUP_URL = 'https://www.facebook.com/groups/govegas';

/** Public site path (mounted on tip). */
export const GO_VEGAS_SITE_PATH = '/go-vegas';

export const PRODUCT_ACCOUNT_NAMES = {
  parent: 'Taloa',
  sites: 'SiteBuilder by Taloa',
  sitesShort: 'SiteBuilder',
  social: 'Taloa Social',
  network: 'Go Vegas',
  human: 'Adam Hopkins',
};

/**
 * Adam (admin / human): ~12 discussion + LV pulse posts/day.
 * Each product account: 5–10 (up to ~20) with its own personality — specialty value, not Adam clones.
 */
export const GO_VEGAS_CADENCE = {
  adamPerDay: { min: 10, target: 12, max: 15 },
  productAccountPerDay: { min: 5, target: 8, max: 20 },
  valueBeforePromoFromProduct: 15,
  promoOwner: 'human_admin',
};

/** Daily recognition question → Best Of outreach → join network. */
export const RECOGNITION_QUESTION_BANK = [
  'What business went out of their way for you recently in Las Vegas — and what did they do?',
  'Favorite place to grab lunch between jobs or client meetings in the valley?',
  'Who fixed something for you last minute and didn’t make you feel like a burden?',
  'Best customer service experience you’ve had in Vegas in the last 30 days?',
  'Which local spot do you bring out-of-town friends to so Vegas looks good?',
  'Who’s a small business here that deserves way more attention than they get?',
  'Coffee / breakfast stop that never lets you down before a long day?',
  'Who went above and beyond after a mistake — and earned your loyalty?',
];

/** Rotating sub-promo threads inside the group (mix daily — not the same ask). */
export const DAILY_SUBPROMO_THREADS = [
  { id: 'business_card', label: 'Business card day', prompt: 'Drop your digital business card — one line what you do + who you want intros to. No walls of text.' },
  { id: 'member_discount', label: 'Member exclusive', prompt: 'Go Vegas members only: what’s one exclusive discount or perk you’d offer someone from this group this week?' },
  { id: 'looking_for', label: 'Looking for', prompt: 'Looking for a Vegas vendor? Post the need. Looking for clients in a niche? Post who you help — keep it human.' },
  { id: 'win_wall', label: 'Win wall', prompt: 'One win from this week — big or small. Celebrate each other.' },
  { id: 'intro_wanted', label: 'Warm intro', prompt: 'Who do you want a warm intro to? Be specific (niche + neighborhood). Who can make that intro?' },
  { id: 'hire_help', label: 'Hiring / help', prompt: 'Hiring, or know someone great looking for work? One post — role + area.' },
];

/** Contest / surprise rewards (use sparingly — feels generous, not spammy). */
export const REWARD_HOOKS = [
  { id: 'free_site_contest', label: 'Free SiteBuilder site contest', note: 'Prize = free publish/spec site via SiteBuilder by Taloa' },
  { id: 'random_kindness', label: 'Random recognition gift', note: 'If someone is called out for kindness, surprise free site/logo when it fits' },
];

export function pickRecognitionQuestion(dayIndex = Date.now()) {
  const i = Math.abs(Number(dayIndex)) % RECOGNITION_QUESTION_BANK.length;
  return RECOGNITION_QUESTION_BANK[i];
}

export function pickSubPromoThread(dayIndex = Date.now()) {
  const i = Math.abs(Number(dayIndex)) % DAILY_SUBPROMO_THREADS.length;
  return DAILY_SUBPROMO_THREADS[i];
}

/**
 * Outreach after a business is named in a recognition thread.
 * Partial quote + join link + Best Of mention — not a hard SiteBuilder pitch.
 */
export function buildRecognitionOutreachEmail({
  businessName,
  partialQuote,
  nominatorHint = 'someone in our community',
  bestOfUrl = '',
  groupUrl = GO_VEGAS_GROUP_URL,
} = {}) {
  const name = String(businessName || 'there').trim();
  const quote = String(partialQuote || '').trim().slice(0, 280);
  const bestOf = bestOfUrl || `https://lumin-web-production-e3a9.up.railway.app${GO_VEGAS_SITE_PATH}#best-of`;
  return {
    subject: `${name} — recognized as a Superior Place of Business (Go Vegas)`,
    text: [
      `Hi ${name},`,
      '',
      `I'm Adam Hopkins with Go Vegas — a free Las Vegas business referral network (16,000+ on Facebook).`,
      '',
      `${nominatorHint} recognized you in our community${quote ? ` for this: "${quote}"` : '.'}`,
      '',
      `We're adding standout local businesses to the Go Vegas Best Of list and inviting you into the free network — referrals, visibility, and real local intros. No fee. No webinar.`,
      '',
      `See Best Of: ${bestOf}`,
      `Join the group: ${groupUrl}`,
      '',
      `If this isn't for you, reply remove and I won't follow up.`,
      '',
      `— Adam`,
    ].join('\n'),
  };
}

export default {
  GO_VEGAS_GROUP_URL,
  GO_VEGAS_SITE_PATH,
  PRODUCT_ACCOUNT_NAMES,
  GO_VEGAS_CADENCE,
  RECOGNITION_QUESTION_BANK,
  DAILY_SUBPROMO_THREADS,
  REWARD_HOOKS,
  pickRecognitionQuestion,
  pickSubPromoThread,
  buildRecognitionOutreachEmail,
};