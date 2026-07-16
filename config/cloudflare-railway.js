/**
 * SYNOPSIS: Cloudflare front-door → Railway host map for Taloa OS.
 * Domain taloaos.com is Cloudflare-registered; public hosts proxy to lumin-web.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { BRAND } from './taloa-brand.js';

/** Railway edge hostname for lumin-web (CNAME target). Override via env when it changes. */
export const RAILWAY_SERVICE_HOSTNAME =
  process.env.RAILWAY_PUBLIC_DOMAIN
  || process.env.RAILWAY_STATIC_URL?.replace(/^https?:\/\//, '')
  || 'lumin-web-production-e3a9.up.railway.app';

/**
 * Hosts to attach on Railway + create as Cloudflare CNAMEs (orange-cloud / proxied).
 * SSL: Cloudflare Full (strict) once Railway cert is issued.
 */
export const CLOUDFLARE_RAILWAY_HOSTS = [
  {
    host: BRAND.siteBuilderHost,
    purpose: 'Site Builder public sales + previews',
    setSiteBaseUrl: true,
  },
  {
    host: BRAND.appHost,
    purpose: 'Taloa / LifeOS app shell',
    setSiteBaseUrl: false,
  },
  {
    host: BRAND.domain,
    purpose: 'Apex — optional redirect to app later',
    setSiteBaseUrl: false,
    apex: true,
  },
];

export const CLOUDFLARE_SSL_MODE = 'full'; // Full (strict) after origin cert valid
export const CLOUDFLARE_PROXY_DEFAULT = true;

export function cnameTarget() {
  return String(RAILWAY_SERVICE_HOSTNAME).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export default {
  BRAND,
  RAILWAY_SERVICE_HOSTNAME,
  CLOUDFLARE_RAILWAY_HOSTS,
  cnameTarget,
};