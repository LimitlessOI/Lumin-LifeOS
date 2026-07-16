/**
 * SYNOPSIS: Site Builder outreach mailbox roster — free-provider brand names.
 * Public Site Builder host: sitebuilder.taloaos.com (domain taloaos.com).
 * Excludes founder personal and eXp. Prefer Yahoo / Outlook (Hotmail) consumers.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

import { BRAND } from './taloa-brand.js';

export const SITE_BUILDER_PUBLIC_HOST = BRAND.siteBuilderHost;
export const SITE_BUILDER_PUBLIC_ORIGIN = BRAND.siteBuilderUrl;

export const OUTREACH_PRIMARY_MAILBOX = 'LifeOS@hopkinsgroup.org';

export const OUTREACH_EXCLUDED_MAILBOXES = [
  'adam@hopkinsgroup.org',
  'adam.hopkins@exprealty.com',
];

/**
 * Ten Site Builder–branded consumer mailboxes across Yahoo + Outlook/Hotmail.
 * localPart is the preferred signup username; provider may require a suffix if taken.
 */
export const SITE_BUILDER_OUTREACH_MAILBOXES = [
  { local: 'SiteBuilder', email: 'SiteBuilder@yahoo.com', displayName: 'Site Builder', provider: 'yahoo', signupUrl: 'https://login.yahoo.com/account/create' },
  { local: 'SiteBuilder1', email: 'SiteBuilder1@yahoo.com', displayName: 'Site Builder 1', provider: 'yahoo', signupUrl: 'https://login.yahoo.com/account/create' },
  { local: 'SiteBuilder2026', email: 'SiteBuilder2026@yahoo.com', displayName: 'Site Builder 2026', provider: 'yahoo', signupUrl: 'https://login.yahoo.com/account/create' },
  { local: 'SiteBuilderHQ', email: 'SiteBuilderHQ@yahoo.com', displayName: 'Site Builder HQ', provider: 'yahoo', signupUrl: 'https://login.yahoo.com/account/create' },
  { local: 'SitesBuiltForYou', email: 'SitesBuiltForYou@yahoo.com', displayName: 'Sites Built For You', provider: 'yahoo', signupUrl: 'https://login.yahoo.com/account/create' },
  { local: 'SiteBuilder', email: 'SiteBuilder@outlook.com', displayName: 'Site Builder', provider: 'outlook', signupUrl: 'https://signup.live.com/' },
  { local: 'SiteBuilder1', email: 'SiteBuilder1@outlook.com', displayName: 'Site Builder 1', provider: 'outlook', signupUrl: 'https://signup.live.com/' },
  { local: 'SiteBuilder2026', email: 'SiteBuilder2026@hotmail.com', displayName: 'Site Builder 2026', provider: 'hotmail', signupUrl: 'https://signup.live.com/' },
  { local: 'HotSiteBuilder', email: 'HotSiteBuilder@hotmail.com', displayName: 'Hot Site Builder', provider: 'hotmail', signupUrl: 'https://signup.live.com/' },
  { local: 'SiteBuilderPro', email: 'SiteBuilderPro@outlook.com', displayName: 'Site Builder Pro', provider: 'outlook', signupUrl: 'https://signup.live.com/' },
];

export function isOutreachMailboxAllowed(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  if (OUTREACH_EXCLUDED_MAILBOXES.some((x) => x.toLowerCase() === e)) return false;
  return SITE_BUILDER_OUTREACH_MAILBOXES.some((m) => m.email.toLowerCase() === e)
    || e === OUTREACH_PRIMARY_MAILBOX.toLowerCase()
    || e === 'lumea.lifeos@gmail.com';
}

export function pickOutreachMailbox(seed = '') {
  const list = SITE_BUILDER_OUTREACH_MAILBOXES;
  if (!list.length) return { email: OUTREACH_PRIMARY_MAILBOX, displayName: 'LifeOS Site Builder' };
  let h = 2166136261;
  const s = String(seed || Date.now());
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return list[Math.abs(h) % list.length];
}