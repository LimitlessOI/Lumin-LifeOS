/**
 * SYNOPSIS: Go Vegas free business network — outreach copy, targeting, follow-up cadence.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */

export const GO_VEGAS_DEFAULT_CITY = 'Las Vegas, NV';

export const GO_VEGAS_BUSINESS_TYPES = [
  'restaurant',
  'salon',
  'spa',
  'gym',
  'dentist',
  'chiropractor',
  'contractor',
  'plumber',
  'electrician',
  'hvac',
  'auto repair',
  'retail store',
  'boutique',
  'law firm',
  'accountant',
  'insurance agency',
  'real estate office',
  'marketing agency',
  'photographer',
  'event planner',
  'cleaning service',
  'landscaping',
  'pet groomer',
  'veterinarian',
  'coffee shop',
];

export const GO_VEGAS_BENEFITS = [
  'Completely free — no membership fee, no upsell',
  'Connect with other Las Vegas business owners who actually refer each other',
  'Local visibility inside a large, active Facebook business community',
  'Collaboration, vendor swaps, and warm introductions — not spam',
  'Run by Adam Hopkins — local operator, value-first, no hype',
];

export const GO_VEGAS_FOLLOW_UP_DAYS = [3, 7, 14];

export const GO_VEGAS_CAMPAIGN_ID = 'go_vegas_network_invite_v1';

export const GO_VEGAS_DEFAULT_FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/govegas';

export const GO_VEGAS_DEFAULT_FROM_EMAIL = 'adam@hopkinsgroup.org';

export const GO_VEGAS_DEFAULT_SEND_LIMITS = {
  maxInvitesPerDay: 8,
  maxFollowUpsPerDay: 5,
  maxTotalPerDay: 12,
};

function formatFromAddress(name, email) {
  const addr = String(email || '').trim();
  if (!addr) return '';
  const display = String(name || '').trim();
  return display ? `${display} <${addr}>` : addr;
}

export function getGoVegasSendLimits(env = process.env) {
  return {
    maxInvitesPerDay: Math.max(1, parseInt(env.GO_VEGAS_MAX_INVITES_PER_DAY, 10) || GO_VEGAS_DEFAULT_SEND_LIMITS.maxInvitesPerDay),
    maxFollowUpsPerDay: Math.max(0, parseInt(env.GO_VEGAS_MAX_FOLLOWUPS_PER_DAY, 10) || GO_VEGAS_DEFAULT_SEND_LIMITS.maxFollowUpsPerDay),
    maxTotalPerDay: Math.max(1, parseInt(env.GO_VEGAS_MAX_EMAILS_PER_DAY, 10) || GO_VEGAS_DEFAULT_SEND_LIMITS.maxTotalPerDay),
    timezone: String(env.GO_VEGAS_TIMEZONE || 'America/Los_Angeles').trim(),
  };
}

export function evaluateSendQuota(usage, limits) {
  const remaining = {
    invites: Math.max(0, limits.maxInvitesPerDay - (usage.invites || 0)),
    followUps: Math.max(0, limits.maxFollowUpsPerDay - (usage.followUps || 0)),
    total: Math.max(0, limits.maxTotalPerDay - (usage.total || 0)),
  };
  return {
    usage,
    limits,
    remaining,
    canSendInvite: remaining.invites > 0 && remaining.total > 0,
    canSendFollowUp: remaining.followUps > 0 && remaining.total > 0,
  };
}

export function getGoVegasConfig(env = process.env) {
  const facebookGroupUrl = String(
    env.GO_VEGAS_FACEBOOK_GROUP_URL || env.GO_VEGAS_FB_GROUP_URL || GO_VEGAS_DEFAULT_FACEBOOK_GROUP_URL
  ).trim();
  const founderName = String(env.GO_VEGAS_FOUNDER_NAME || 'Adam Hopkins').trim();
  const fromAddress = String(
    env.GO_VEGAS_FROM_EMAIL || env.GO_VEGAS_FROM || GO_VEGAS_DEFAULT_FROM_EMAIL
  ).trim();
  const fromEmail = formatFromAddress(founderName, fromAddress);
  const replyTo = String(
    env.GO_VEGAS_REPLY_TO || fromAddress || GO_VEGAS_DEFAULT_FROM_EMAIL
  ).trim();
  const communitySizeHint = String(env.GO_VEGAS_COMMUNITY_SIZE || '17,000+').trim();
  const sendLimits = getGoVegasSendLimits(env);

  const blockers = [];
  if (!facebookGroupUrl) blockers.push('GO_VEGAS_FACEBOOK_GROUP_URL');
  if (!fromAddress) blockers.push('GO_VEGAS_FROM_EMAIL');

  return {
    campaignId: GO_VEGAS_CAMPAIGN_ID,
    city: GO_VEGAS_DEFAULT_CITY,
    facebookGroupUrl,
    founderName,
    fromEmail,
    fromAddress,
    replyTo,
    communitySizeHint,
    benefits: GO_VEGAS_BENEFITS,
    followUpDays: GO_VEGAS_FOLLOW_UP_DAYS,
    sendLimits,
    ready: blockers.length === 0,
    blockers,
  };
}

export function buildInviteEmail({ businessName, contactName, config }) {
  const name = contactName ? `${contactName},` : 'Hi there,';
  const group = config.facebookGroupUrl;
  const benefits = config.benefits.slice(0, 4).map((b) => `• ${b}`).join('\n');

  const subject = `${businessName || 'Your business'} — free Las Vegas business network invite`;

  const text = `${name}

I'm ${config.founderName}. I run Go Vegas — a free business network for Las Vegas owners and operators.

No cost. No pitch. Just local businesses helping each other with referrals, visibility, and collaboration.

Why owners join:
${benefits}

We're ${config.communitySizeHint} strong on Facebook already. I'd love to have ${businessName || 'you'} in the room.

Join free here:
${group}

If this isn't for you, reply "remove" and I won't follow up.

— ${config.founderName}
Go Vegas Business Network`;

  const html = `<p>${name}</p>
<p>I'm <strong>${config.founderName}</strong>. I run <strong>Go Vegas</strong> — a free business network for Las Vegas owners and operators.</p>
<p><strong>No cost. No pitch.</strong> Just local businesses helping each other with referrals, visibility, and collaboration.</p>
<p><strong>Why owners join:</strong></p>
<ul>${config.benefits.slice(0, 4).map((b) => `<li>${b}</li>`).join('')}</ul>
<p>We're <strong>${config.communitySizeHint}</strong> strong on Facebook already. I'd love to have <strong>${businessName || 'you'}</strong> in the room.</p>
<p><a href="${group}">Join free — Go Vegas on Facebook</a></p>
<p style="color:#666;font-size:13px">If this isn't for you, reply "remove" and I won't follow up.</p>
<p>— ${config.founderName}<br>Go Vegas Business Network</p>`;

  return { subject, text, html };
}

export function buildFollowUpEmail({ businessName, contactName, followUpNumber, config }) {
  const name = contactName ? `${contactName},` : 'Hi again,';
  const group = config.facebookGroupUrl;

  const subjects = {
    1: `Still free — ${businessName || 'your spot'} in Go Vegas`,
    2: `Quick bump — Las Vegas business network (free)`,
    3: `Last note — Go Vegas invite for ${businessName || 'you'}`,
  };

  const intros = {
    1: `Wanted to bump this in case it got buried. Go Vegas is still completely free — local owners referring and supporting each other.`,
    2: `Most owners say yes once they see it's zero cost and actually local. No webinar, no funnel — just the Facebook group.`,
    3: `Last follow-up from me on this. Totally fine if the timing isn't right — reply "remove" and I'm done.`,
  };

  const subject = subjects[followUpNumber] || subjects[1];
  const intro = intros[followUpNumber] || intros[1];

  const text = `${name}

${intro}

Join free: ${group}

— ${config.founderName}`;

  const html = `<p>${name}</p><p>${intro}</p><p><a href="${group}">Join free — Go Vegas on Facebook</a></p><p>— ${config.founderName}</p>`;

  return { subject, text, html };
}
