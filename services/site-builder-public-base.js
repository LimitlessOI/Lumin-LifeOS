/**
 * SYNOPSIS: Resolvable public origin for Site Builder money-path URLs.
 * Prefer the request host the client actually reached. Never emit a known-dead
 * branded host (e.g. sitebuilder.taloaos.com before Cloudflare DNS exists) in
 * checkout success/cancel, referral, or cold-email preview links.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { BRAND } from '../config/taloa-brand.js';

const UNRESOLVED_PUBLIC_HOSTS = new Set(
  [BRAND.siteBuilderHost, `www.${BRAND.siteBuilderHost}`]
    .filter(Boolean)
    .map((h) => String(h).toLowerCase()),
);

/** Client sites must never become Site Builder link origins (WRM cutover poisoned this once). */
const FORBIDDEN_PUBLIC_HOSTS = new Set([
  'wellroundedmomma.com',
  'www.wellroundedmomma.com',
  'sherrylhopkins.com',
  'www.sherrylhopkins.com',
  'sherrylhopkinsmidwife.com',
  'www.sherrylhopkinsmidwife.com',
]);

const TIP_FALLBACK_ORIGIN = 'https://lumin-web-production-e3a9.up.railway.app';

export function isForbiddenPublicBase(url) {
  const host = hostnameOfPublicBase(url);
  return Boolean(host && FORBIDDEN_PUBLIC_HOSTS.has(host));
}

export function normalizePublicBase(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, '');
}

export function hostnameOfPublicBase(url) {
  const base = normalizePublicBase(url);
  if (!base) return '';
  try {
    return new URL(base).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isUnresolvedPublicBase(url) {
  if (String(process.env.SITE_BUILDER_BRANDED_HOST_LIVE || '').trim() === '1') {
    return false;
  }
  const host = hostnameOfPublicBase(url);
  return Boolean(host && UNRESOLVED_PUBLIC_HOSTS.has(host));
}

/**
 * Durable origin for emails / background jobs (no request).
 * Skips known-unresolved branded hosts until SITE_BUILDER_BRANDED_HOST_LIVE=1.
 */
export function resolveDurablePublicBase(candidates = []) {
  const list = [
    ...(Array.isArray(candidates) ? candidates : [candidates]),
    process.env.SITE_BASE_URL,
    process.env.PUBLIC_BASE_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
    process.env.SITE_BUILDER_FALLBACK_ORIGIN,
    TIP_FALLBACK_ORIGIN,
  ];

  for (const candidate of list) {
    const base = normalizePublicBase(candidate);
    if (!base) continue;
    if (isUnresolvedPublicBase(base)) continue;
    if (isForbiddenPublicBase(base)) continue;
    return base;
  }

  return TIP_FALLBACK_ORIGIN;
}

/**
 * Request-scoped origin: use the host the caller hit (guaranteed resolvable for them).
 * Fall back to durable resolution if headers are missing.
 */
export function resolveRequestPublicBase(req, configuredBase = '') {
  const fwdProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const fwdHost = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();
  if (fwdHost) {
    return normalizePublicBase(`${fwdProto || 'https'}://${fwdHost}`);
  }
  const origin = String(req?.headers?.origin || '').trim();
  if (origin) {
    return normalizePublicBase(origin);
  }
  return resolveDurablePublicBase([configuredBase]);
}

export default {
  normalizePublicBase,
  hostnameOfPublicBase,
  isUnresolvedPublicBase,
  isForbiddenPublicBase,
  resolveDurablePublicBase,
  resolveRequestPublicBase,
};