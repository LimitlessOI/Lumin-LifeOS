/**
 * SYNOPSIS: Build a full Go Vegas daily post pack (31+) for human approve → paste.
 * Automates prep; Meta posting stays approve-gated (no FB login automation).
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import {
  GO_VEGAS_CADENCE,
  GO_VEGAS_GROUP_URL,
  PRODUCT_ACCOUNT_NAMES,
  RECOGNITION_QUESTION_BANK,
  RECOMMENDATION_ASK_BANK,
  DAILY_SUBPROMO_THREADS,
  buildBestPostContestAnnounce,
  pickRecognitionQuestion,
  pickRecommendationAsk,
  pickSubPromoThread,
} from '../config/go-vegas-network-playbook.js';

const LV_PULSE = [
  'Vegas owners — what’s one thing the summer heat changes about how you run the business?',
  'Strip vs locals: where are you actually getting customers from this month?',
  'Anyone else noticing hiring get harder / easier in the valley right now?',
  'Best neighborhood in LV for a new service business to start — and why?',
  'What’s a Las Vegas “secret” that out-of-towners never get about doing business here?',
  'Slow midweek afternoon: are you chasing leads or catching up on admin?',
  'Convention weeks — do they help your business or just clog the roads?',
];

const ADAM_DISCUSSION = [
  'What’s one business habit you wish you’d started two years earlier?',
  'When a customer is wrong but you still want to keep them — what do you do?',
  'Cash or relationships: which saved your business the last time things got tight?',
  'What’s the nicest unexpected referral you’ve gotten from another owner here?',
  'If you could only market one way in Vegas for 90 days, what would you pick?',
  'Who taught you the most about running a business — and what was the lesson?',
  'What’s a “small” expense that actually made you more money?',
  'Open floor: what’s the one problem you want this group’s help with today?',
];

const SITEBUILDER_VALUE = [
  'Hot take: more blog posts don’t fix a site that doesn’t tell people what to do next. What’s the one action you want visitors to take?',
  'SEO reality check — Google cares more about trust + clear pages than AI article dumps. What’s one page on your site you’d rewrite first?',
  'Your homepage has about 5 seconds. What’s the one sentence a stranger should understand?',
  'Photos you took of real jobs beat stock every time. When did a photo actually win you a customer?',
  'A website’s job is one decision: call, book, or buy. What decision should yours force?',
  'If your Google Business and website say different things, people bounce. Are yours aligned?',
  '“We need more content” usually means “we need a clearer offer.” Agree or disagree?',
  'Mobile first isn’t a buzzword when half your leads are on a phone in a parking lot. How’s your site on mobile — honest?',
];

const SOCIAL_VALUE = [
  'Posting every day with no conversation is just yelling into the void. What’s one post that actually started a thread for you?',
  'AI can draft — but if it sounds like everyone else, it dies. What’s your tell that content is generic?',
  'Polls and questions beat carousels of tips nobody asked for. What question would you ask your customers today?',
  'The algorithm likes comments. What’s the last thing you posted that got real replies?',
];

const POLLS = [
  {
    body: 'Quick poll for Vegas owners — biggest leak right now?',
    options: ['Not enough leads', 'Leads that don’t convert', 'No time to follow up', 'Looks fine online but phone quiet'],
  },
  {
    body: 'When do you ask for a Google review?',
    options: ['Right after the job', 'Next morning', 'When they say thanks', 'I forget'],
  },
  {
    body: 'Best way a stranger finds you?',
    options: ['Google', 'Referral', 'Social', 'Driving by / sign'],
  },
];

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function dayIndexFromDate(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return Math.floor(x.getTime() / 86400000);
}

function pickRotating(list, dayIndex, offset = 0) {
  if (!list.length) return null;
  return list[Math.abs(dayIndex + offset) % list.length];
}

function slotTimes(count, startHour = 7, endHour = 21) {
  const times = [];
  const span = Math.max(1, endHour - startHour);
  for (let i = 0; i < count; i++) {
    const t = startHour + (span * i) / Math.max(1, count - 1);
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    const mm = String(m === 60 ? 0 : m).padStart(2, '0');
    const hh = String(m === 60 ? h + 1 : h).padStart(2, '0');
    times.push(`${hh}:${mm}`);
  }
  return times;
}

let _seq = 0;
function item({ account, lane, body, options = null, firstComment = null, notes = '' }) {
  _seq += 1;
  return {
    id: `${String(account).slice(0, 12).replace(/\s+/g, '_')}_${lane}_${_seq}`,
    account,
    lane,
    body,
    options,
    firstComment,
    notes,
    status: 'pending_approval',
  };
}

/**
 * Build one day’s approve-queue (~31+ owned posts) with suggested Pacific times.
 */
export function buildGoVegasDailyPack({ date = new Date(), includeContest = true } = {}) {
  const d = date instanceof Date ? date : new Date(date);
  const idx = dayIndexFromDate(new Date(d));
  _seq = 0;
  const posts = [];

  posts.push(item({
    account: PRODUCT_ACCOUNT_NAMES.human,
    lane: 'recognition',
    body: pickRecognitionQuestion(idx),
    notes: 'Watch for named businesses → recognition outreach email',
  }));

  const rec = pickRecommendationAsk(idx);
  posts.push(item({
    account: PRODUCT_ACCOUNT_NAMES.human,
    lane: 'recommendation_ask',
    body: rec.prompt,
    notes: `Niche: ${rec.niche} — named businesses → soft-open + free spec`,
  }));

  const sub = pickSubPromoThread(idx);
  posts.push(item({
    account: PRODUCT_ACCOUNT_NAMES.human,
    lane: 'subpromo',
    body: sub.prompt,
    notes: sub.label,
  }));

  if (includeContest) {
    posts.push(item({
      account: PRODUCT_ACCOUNT_NAMES.human,
      lane: 'contest',
      body: buildBestPostContestAnnounce(),
      notes: 'Comment-weighted scoring; announce winner tomorrow',
    }));
  }

  for (let i = 0; i < 8; i++) {
    posts.push(item({
      account: PRODUCT_ACCOUNT_NAMES.human,
      lane: 'discussion',
      body: pickRotating(ADAM_DISCUSSION, idx, i),
    }));
  }

  for (let i = 0; i < 3; i++) {
    posts.push(item({
      account: PRODUCT_ACCOUNT_NAMES.human,
      lane: 'lv_pulse',
      body: pickRotating(LV_PULSE, idx, i),
    }));
  }

  const poll = pickRotating(POLLS, idx, 0);
  posts.push(item({
    account: PRODUCT_ACCOUNT_NAMES.human,
    lane: 'poll',
    body: poll.body,
    options: poll.options,
    notes: 'Post as Facebook native poll',
  }));

  for (let i = 0; i < 10; i++) {
    posts.push(item({
      account: PRODUCT_ACCOUNT_NAMES.sites,
      lane: 'specialty_value',
      body: pickRotating(SITEBUILDER_VALUE, idx, i),
      notes: 'No hard sell — principle + question only',
    }));
  }

  for (let i = 0; i < 6; i++) {
    posts.push(item({
      account: PRODUCT_ACCOUNT_NAMES.social,
      lane: 'specialty_value',
      body: pickRotating(SOCIAL_VALUE, idx, i),
    }));
  }

  // Top up to floor if banks rotate short
  let filler = 0;
  while (posts.length < GO_VEGAS_CADENCE.groupOwnedPostsFloor) {
    posts.push(item({
      account: PRODUCT_ACCOUNT_NAMES.human,
      lane: 'discussion',
      body: pickRotating(ADAM_DISCUSSION, idx, 20 + filler),
      notes: 'Filler to hit 31+ floor — edit if too similar',
    }));
    filler += 1;
  }

  const times = slotTimes(posts.length);
  const scheduled = posts.map((p, i) => ({
    ...p,
    suggestedTimePT: times[i],
    order: i + 1,
  }));

  const byAccount = {};
  for (const p of scheduled) {
    byAccount[p.account] = (byAccount[p.account] || 0) + 1;
  }

  return {
    ok: true,
    date: dayKey(d),
    timezone: 'America/Los_Angeles',
    groupUrl: GO_VEGAS_GROUP_URL,
    targetOwned: GO_VEGAS_CADENCE.groupOwnedPostsFloor,
    memberPostsTarget: GO_VEGAS_CADENCE.memberPostsTarget,
    counts: { total: scheduled.length, byAccount },
    instructions: [
      'Approve or edit each post (status → approved).',
      'Paste at suggestedTimePT as the named account (stagger — do not dump).',
      'Reply in the first hour on anything with comments.',
      'Links go in the first comment, never the post body.',
      'Paste named businesses here → we draft recognition / soft-open emails.',
    ],
    posts: scheduled,
    recognitionBankSize: RECOGNITION_QUESTION_BANK.length,
    recommendationBankSize: RECOMMENDATION_ASK_BANK.length,
    subPromoBankSize: DAILY_SUBPROMO_THREADS.length,
  };
}

export function formatDailyPackMarkdown(pack) {
  const lines = [
    `# Go Vegas daily pack — ${pack.date} (${pack.timezone})`,
    '',
    `Target: *${pack.counts.total}** owned posts (floor ${pack.targetOwned}). Member aim +${pack.memberPostsTarget}.`,
    `Group: ${pack.groupUrl}`,
    '',
    '## Counts',
    ...Object.entries(pack.counts.byAccount).map(([a, n]) => `- ${a}: ${n}`),
    '',
    '## Instructions',
    ...pack.instructions.map((i) => `- ${i}`),
    '',
    '## Posts',
  ];
  for (const p of pack.posts) {
    lines.push('', `### ${p.order}. ${p.suggestedTimePT} PT — *${p.account}** (${p.lane})`);
    lines.push('', p.body);
    if (p.options?.length) lines.push('', `Poll options: ${p.options.join(' · ')}`);
    if (p.firstComment) lines.push('', `First comment: ${p.firstComment}`);
    if (p.notes) lines.push('', `_Note: ${p.notes}_`);
  }
  return `${lines.join('\n')}\n`;
}

export default { buildGoVegasDailyPack, formatDailyPackMarkdown };