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
export const CLOUDFLARE_ZONE_NAME = BRAND.domain;

export function cnameTarget() {
  return String(RAILWAY_SERVICE_HOSTNAME).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Build exact Cloudflare DNS upserts from Railway customDomains payload.
 * Prefer per-host CNAME targets + verification TXT from Railway status.
 */
export function buildDnsRecordsFromRailwayDomains(domainsPayload, {
  proxied = false,
  zone = CLOUDFLARE_ZONE_NAME,
} = {}) {
  const custom = domainsPayload?.domains?.customDomains
    || domainsPayload?.customDomains
    || [];
  const records = [];
  for (const row of custom) {
    const domain = String(row?.domain || '').toLowerCase();
    if (!domain.endsWith(`.${zone}`) && domain !== zone) continue;
    const hostlabel = domain === zone
      ? '@'
      : domain.slice(0, -(zone.length + 1));
    const cnameRec = (row?.status?.dnsRecords || []).find(
      (r) => String(r?.recordType || '').includes('CNAME'),
    );
    const target = String(
      cnameRec?.requiredValue
      || process.env.RAILWAY_PUBLIC_DOMAIN
      || cnameTarget(),
    ).replace(/\.$/, '');
    if (hostlabel && target) {
      records.push({
        type: 'CNAME',
        name: hostlabel === '@' ? zone : `${hostlabel}.${zone}`,
        content: target,
        proxied: Boolean(proxied),
        ttl: 1,
        hostlabel,
      });
    }
    const token = String(row?.status?.verificationToken || '').trim();
    if (token && hostlabel && hostlabel !== '@') {
      records.push({
        type: 'TXT',
        name: `${hostlabel}.${zone}`,
        content: token,
        proxied: false,
        ttl: 1,
        hostlabel,
      });
    }
  }
  return records;
}

async function cfApi(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

export async function resolveCloudflareZoneId(token, zoneName = CLOUDFLARE_ZONE_NAME) {
  const fromEnv = String(process.env.CLOUDFLARE_ZONE_ID || '').trim();
  if (fromEnv) return { zoneId: fromEnv, source: 'env' };
  const { status, json } = await cfApi(
    token,
    `/zones?name=${encodeURIComponent(zoneName)}&status=active`,
  );
  const zoneId = json?.result?.[0]?.id || null;
  return {
    zoneId,
    source: zoneId ? 'api' : 'missing',
    httpStatus: status,
    errors: json?.errors || null,
  };
}

export async function upsertCloudflareDnsRecord(token, zoneId, record) {
  const type = String(record.type || '').toUpperCase();
  const name = String(record.name || '').toLowerCase();
  const content = String(record.content || '');
  const list = await cfApi(
    token,
    `/zones/${zoneId}/dns_records?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`,
  );
  const existing = list.json?.result?.[0];
  const payload = {
    type,
    name,
    content,
    proxied: type === 'CNAME' ? Boolean(record.proxied) : false,
    ttl: record.ttl || 1,
  };
  if (existing?.id) {
    const upd = await cfApi(token, `/zones/${zoneId}/dns_records/${existing.id}`, {
      method: 'PUT',
      body: payload,
    });
    return {
      action: 'updated',
      ok: Boolean(upd.json?.success),
      status: upd.status,
      record: payload,
      errors: upd.json?.errors || null,
      id: existing.id,
    };
  }
  const cre = await cfApi(token, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: payload,
  });
  return {
    action: 'created',
    ok: Boolean(cre.json?.success),
    status: cre.status,
    record: payload,
    errors: cre.json?.errors || null,
    id: cre.json?.result?.id || null,
  };
}

export async function applyCloudflareDnsRecords({
  token,
  zoneId: zoneIdIn = null,
  zoneName = CLOUDFLARE_ZONE_NAME,
  records = [],
}) {
  if (!token) {
    return { ok: false, error: 'CLOUDFLARE_API_TOKEN required', results: [] };
  }
  if (!records.length) {
    return { ok: false, error: 'no DNS records to apply', results: [] };
  }
  let zoneId = zoneIdIn;
  let zoneMeta = null;
  if (!zoneId) {
    zoneMeta = await resolveCloudflareZoneId(token, zoneName);
    zoneId = zoneMeta.zoneId;
  }
  if (!zoneId) {
    return {
      ok: false,
      error: 'CLOUDFLARE_ZONE_ID missing and zone lookup failed',
      zone: zoneMeta,
      results: [],
    };
  }
  const results = [];
  for (const rec of records) {
    results.push(await upsertCloudflareDnsRecord(token, zoneId, rec));
  }
  return {
    ok: results.every((r) => r.ok),
    zoneId,
    zoneName,
    results,
  };
}

export default {
  BRAND,
  RAILWAY_SERVICE_HOSTNAME,
  CLOUDFLARE_RAILWAY_HOSTS,
  CLOUDFLARE_ZONE_NAME,
  cnameTarget,
  buildDnsRecordsFromRailwayDomains,
  resolveCloudflareZoneId,
  upsertCloudflareDnsRecord,
  applyCloudflareDnsRecords,
};