/**
 * SYNOPSIS: Bootstrap Cloudflare ↔ Railway for taloaos.com (domains + optional CF DNS API).
 * Usage:
 *   PUBLIC_BASE_URL=… COMMAND_CENTER_KEY=… node scripts/setup-cloudflare-railway.mjs
 *   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ZONE_ID=…  # optional — creates proxied CNAMEs
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import { BRAND } from '../config/taloa-brand.js';
import { CLOUDFLARE_RAILWAY_HOSTS, cnameTarget } from '../config/cloudflare-railway.js';

const base = (process.env.PUBLIC_BASE_URL || process.env.SITE_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_COMMAND_KEY || '';
const cfToken = process.env.CLOUDFLARE_API_TOKEN || '';
const cfZone = process.env.CLOUDFLARE_ZONE_ID || '';

async function tip(path, { method = 'GET', body } = {}) {
  if (!base || !key) throw new Error('PUBLIC_BASE_URL + COMMAND_CENTER_KEY required');
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-command-key': key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { status: res.status, json };
}

async function ensureCfDns({ name, target, proxied = true }) {
  if (!cfToken || !cfZone) return { skipped: true, reason: 'CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID missing' };
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${cfZone}/dns_records?type=CNAME&name=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${cfToken}` } },
  );
  const list = await listRes.json();
  const existing = list?.result?.[0];
  const payload = {
    type: 'CNAME',
    name,
    content: target,
    proxied,
    ttl: 1,
  };
  if (existing?.id) {
    const upd = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZone}/dns_records/${existing.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cfToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
    return { updated: true, status: upd.status, body: await upd.json() };
  }
  const cre = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${cfZone}/dns_records`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  return { created: true, status: cre.status, body: await cre.json() };
}

async function main() {
  const target = cnameTarget();
  console.log(JSON.stringify({
    brand: BRAND.name,
    zone: BRAND.domain,
    railway_cname_target: target,
    hosts: CLOUDFLARE_RAILWAY_HOSTS.map((h) => h.host),
  }, null, 2));

  const boot = await tip('/api/v1/railway/managed-env/custom-domains/bootstrap-taloa', {
    method: 'POST',
    body: { includeApex: false },
  });
  console.log('railway_bootstrap', boot.status, JSON.stringify(boot.json, null, 2).slice(0, 4000));

  const listed = await tip('/api/v1/railway/managed-env/custom-domains');
  console.log('railway_list', listed.status, JSON.stringify(listed.json, null, 2).slice(0, 3000));

  // Prefer tip system path (exact Railway CNAME+TXT per host)
  const applied = await tip('/api/v1/railway/managed-env/custom-domains/apply-cloudflare-dns', {
    method: 'POST',
    body: { proxied: false },
  });
  console.log('apply_cloudflare_dns', applied.status, JSON.stringify(applied.json, null, 2).slice(0, 4000));

  // Fallback local upsert if tip has no token yet but local env does
  const dnsOut = [];
  if (!applied.json?.ok && cfToken && cfZone) {
    for (const h of CLOUDFLARE_RAILWAY_HOSTS.filter((x) => !x.apex)) {
      const name = h.host;
      const r = await ensureCfDns({ name, target, proxied: false });
      dnsOut.push({ host: name, ...r });
    }
  }
  console.log('cloudflare_dns_fallback', JSON.stringify(dnsOut, null, 2).slice(0, 4000));

  if (boot.json?.ok) {
    const envSet = await tip('/api/v1/railway/managed-env/bulk', {
      method: 'POST',
      body: {
        vars: {
          SITE_BASE_URL: BRAND.siteBuilderUrl,
        },
        actor: 'setup-cloudflare-railway',
      },
    });
    console.log('site_base_url', envSet.status, JSON.stringify(envSet.json, null, 2).slice(0, 1500));
  }

  console.log('\nNEXT:');
  console.log(`1. Cloudflare DNS (zone ${BRAND.domain}): CNAME sitebuilder → ${target} (DNS only, then Proxied)`);
  console.log(`2. CNAME app → ${target}`);
  console.log('3. SSL/TLS → Full');
  console.log(`4. Prove: curl -I https://${BRAND.siteBuilderHost}/`);
  if (!cfToken) {
    console.log('5. Optional: create Cloudflare API token (Zone.DNS Edit) → set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID on tip, re-run');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});