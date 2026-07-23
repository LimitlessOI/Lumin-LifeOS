/**
 * SYNOPSIS: Go Vegas free network — multi-brand posting + recognition flywheel.
 * Meta group recommendations surface "31+" activity — we target that floor daily.
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
 * Facebook surfaces "31+" (vs "10+") when the group is this active —
 * that drives recommendations. Owned posts must clear 31; member posts are bonus.
 *
 * Rough split (adjust by day, stay human):
 * - Adam: ~12 discussion / recognition / LV pulse
 * - Product accounts combined: ~20 (SiteBuilder, Taloa Social, etc. — own personalities)
 * - Member-stimulated: aim +20 (rec asks, card days, exclusives)
 */
export const GO_VEGAS_CADENCE = {
  /** Hard floor so the group shows 31+ in Meta's activity chip */
  groupOwnedPostsFloor: 31,
  groupOwnedPostsTarget: 35,
  memberPostsTarget: 20,
  adamPerDay: { min: 10, target: 12, max: 15 },
  productAccountsCombinedPerDay: { min: 18, target: 20, max: 28 },
  productAccountPerDay: { min: 5, target: 8, max: 12 },
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

/**
 * Recommendation-ask posts from our product/network voices.
 * Members (and we) name plumbers, HVAC, dentists, etc. → warm soft-open to that business.
 */
export const RECOMMENDATION_ASK_BANK = [
  { niche: 'plumber', prompt: 'Vegas folks — who do you actually trust for a plumber when something breaks at the worst time? Drop a name + why.' },
  { niche: 'hvac', prompt: 'Who’s your go-to HVAC person in the valley when the AC dies in July? Real recommendations only.' },
  { niche: 'electrician', prompt: 'Need an electrician recommendation in Las Vegas — who have you used and would use again?' },
  { niche: 'dentist', prompt: 'Who’s a dentist in LV you’d send family to? Not the biggest billboard — who you trust.' },
  { niche: 'realtor', prompt: 'Buying or selling in the valley — which realtor actually took care of you?' },
  { niche: 'auto-repair', prompt: 'Honest auto shop in Las Vegas that doesn’t make you feel dumb — who?' },
  { niche: 'restaurant', prompt: 'Client lunch that never fails in Las Vegas — where are you taking people lately?' },
  { niche: 'web-designer', prompt: 'Has anyone here had a website rebuilt that actually got them more calls? Who did it?' },
  { niche: 'lawyer', prompt: 'Need a referral: solid local attorney for small business stuff in NV — who do you trust?' },
  { niche: 'cleaner', prompt: 'House / office cleaner you’d recommend without hesitating — drop them.' },
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
  {
    id: 'best_post_free_site',
    label: 'Best post of the day → free website',
    note: 'Daily (or a few×/week): whoever posts the best post today wins a free SiteBuilder site. Drives member posts toward the +20 target.',
    prize: 'free SiteBuilder by Taloa website (spec + publish)',
  },
  { id: 'free_site_contest', label: 'Free SiteBuilder site contest', note: 'Prize = free publish/spec site via SiteBuilder by Taloa' },
  { id: 'random_kindness', label: 'Random recognition gift', note: 'If someone is called out for kindness, surprise free site/logo when it fits' },
];

/**
 * Best-post contest scoring — comments dominate (Meta MSI / group ranking).
 * KNOW: Meta Individual Group Feed predicts comment likelihood using group comment totals.
 * THINK: ~5× comment weight vs reaction is industry consensus for “conversation > vanity.”
 * Replies-on-comments count as comments (back-and-forth is the viral signal).
 */
export const BEST_POST_CONTEST = {
  id: 'best_post_free_site',
  cadence: 'daily_or_3x_week',
  prize: 'Free website via SiteBuilder by Taloa',
  scoring: {
    pointsPerComment: 5,
    pointsPerReaction: 1,
    /** Optional: shares are rarer but strong distribution signal */
    pointsPerShare: 3,
    rulePublic:
      'Winner = highest score by end of day (Pacific). Comments = 5 pts each. Reactions = 1 pt. Shares = 3 pts. Replies in a thread count as comments. Ties → most comments wins.',
  },
  announcePost:
    'Contest today: best post wins a free website (SiteBuilder by Taloa).\n\nHow we pick the winner (transparent): Comments count 5× more than likes — because conversation is what grows this group. Score = (comments × 5) + (reactions × 1) + (shares × 3). Winner announced tomorrow morning.\n\nPost something useful, funny, or real for Vegas owners. Go.',
  winnerPostTemplate: ({ winnerName, postHint = '', score = null } = {}) =>
    [
      `Yesterday’s winner: ${winnerName || 'our winner'}${postHint ? ` — “${String(postHint).slice(0, 120)}”` : ''}${score != null ? ` (score ${score})` : ''}.`,
      'You just won a free website from SiteBuilder by Taloa. DM me (or comment here) and we’ll build your free spec this week.',
      'Everyone else — same contest today. Comments weigh more than likes. Best post wins.',
    ].join('\n\n'),
};

/** Meta-aligned activity floors (see docs/products/limitlessos/GO_VEGAS_FB_GROWTH_PLAYBOOK.md). */
export const META_GROUP_SIGNALS = {
  /** KNOW — Meta Transparency: Individual Group Feed ranking requires ≥20 posts in past day */
  minPostsPastDayForFeedRanking: 20,
  /** Founder target — activity chip / recommendation surface often shows 31+ */
  activityChipTarget: 31,
  firstHourReplyRequired: true,
  preferNativeOverExternalLinks: true,
};

export function buildBestPostContestAnnounce() {
  return BEST_POST_CONTEST.announcePost;
}

export function buildBestPostWinnerPost(opts = {}) {
  return BEST_POST_CONTEST.winnerPostTemplate(opts);
}

/** Score a candidate post for the free-website contest. */
export function scoreBestPostContest({ comments = 0, reactions = 0, shares = 0 } = {}) {
  const s = BEST_POST_CONTEST.scoring;
  const c = Math.max(0, Number(comments) || 0);
  const r = Math.max(0, Number(reactions) || 0);
  const sh = Math.max(0, Number(shares) || 0);
  return {
    score: c * s.pointsPerComment + r * s.pointsPerReaction + sh * s.pointsPerShare,
    comments: c,
    reactions: r,
    shares: sh,
    breakdown: `${c} comments×${s.pointsPerComment} + ${r} reactions×${s.pointsPerReaction} + ${sh} shares×${s.pointsPerShare}`,
  };
}

export function pickRecognitionQuestion(dayIndex = Date.now()) {
  const i = Math.abs(Number(dayIndex)) % RECOGNITION_QUESTION_BANK.length;
  return RECOGNITION_QUESTION_BANK[i];
}

export function pickSubPromoThread(dayIndex = Date.now()) {
  const i = Math.abs(Number(dayIndex)) % DAILY_SUBPROMO_THREADS.length;
  return DAILY_SUBPROMO_THREADS[i];
}

export function pickRecommendationAsk(dayIndex = Date.now()) {
  const i = Math.abs(Number(dayIndex)) % RECOMMENDATION_ASK_BANK.length;
  return RECOMMENDATION_ASK_BANK[i];
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

/**
 * Soft open after someone in the group recommended a business (plumber, HVAC, etc.).
 * Warm intro first → free spec site → competitor score snapshot → link.
 */
export function buildRecommendationSoftOpenEmail({
  businessName,
  recommenderName = 'a member',
  niche = 'your industry',
  previewUrl = '',
  theirScore = null,
  competitorScore = null,
  upgrades = [],
} = {}) {
  const name = String(businessName || 'there').trim();
  const who = String(recommenderName || 'a member').trim();
  const scoreLine =
    theirScore != null && competitorScore != null
      ? `We scored your current site about a ${theirScore}/10 against local competitors sitting near ${competitorScore}/10.`
      : `We looked at your site next to a few local competitors in ${niche}.`;
  const upgradeLines = (Array.isArray(upgrades) ? upgrades : [])
    .filter(Boolean)
    .slice(0, 5)
    .map((u, i) => `${i + 1}. ${u}`);
  const howWeLift = upgradeLines.length
    ? ['Here\'s how we\'d take it up — the same moves on the free preview:', ...upgradeLines]
    : [
        'On the free preview we tightened the offer, put proof above the fold, and made one clear next step (call/book) so visitors aren\'t guessing.',
      ];

  return {
    subject: `${who} from Go Vegas thought we could help ${name}`,
    text: [
      `Hi ${name},`,
      '',
      `${who} from our Go Vegas business group recommended I reach out — they thought I could really help you.`,
      '',
      `I'm with SiteBuilder by Taloa. We built you a free spec website (like a commercial on spec — look first, only buy if you like it).`,
      '',
      scoreLine,
      ...howWeLift,
      '',
      previewUrl ? `Here's your free preview: ${previewUrl}` : 'Reply with your website URL and I\'ll send the preview link.',
      '',
      `No pitch call required. If it's not useful, ignore this — totally fine.`,
      '',
      `— Adam / SiteBuilder by Taloa`,
      `Go Vegas: ${GO_VEGAS_GROUP_URL}`,
    ].join('\n'),
  };
}

export default {
  GO_VEGAS_GROUP_URL,
  GO_VEGAS_SITE_PATH,
  PRODUCT_ACCOUNT_NAMES,
  GO_VEGAS_CADENCE,
  RECOGNITION_QUESTION_BANK,
  RECOMMENDATION_ASK_BANK,
  DAILY_SUBPROMO_THREADS,
  REWARD_HOOKS,
  BEST_POST_CONTEST,
  pickRecognitionQuestion,
  pickSubPromoThread,
  pickRecommendationAsk,
  buildRecognitionOutreachEmail,
  buildRecommendationSoftOpenEmail,
  META_GROUP_SIGNALS,
  buildBestPostContestAnnounce,
  buildBestPostWinnerPost,
  scoreBestPostContest,
};