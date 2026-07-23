/**
 * SYNOPSIS: Readiness probe for WRM Wix → SiteBuilder cutover (no secrets printed).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';

const domain = process.env.WRM_DOMAIN || 'wellroundedmomma.com';
const previewPath = '/previews/wellrounded-momma/';
const tip = process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app';

function dig(name, type = 'A') {
  try {
    return execSync(`dig +short ${name} ${type}`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const ns = dig(domain, 'NS');
const a = dig(`www.${domain}`, 'A');
const wixDns = ns.some((n) => /wix/i.test(n)) || a.some((ip) => String(ip).startsWith('185.230.'));

let previewOk = false;
let previewStatus = 0;
try {
  const out = execSync(`curl -sI -o /dev/null -w "%{http_code}" "${tip}${previewPath}"`, { encoding: 'utf8' });
  previewStatus = Number(out.trim());
  previewOk = previewStatus >= 200 && previewStatus < 400;
} catch {
  previewOk = false;
}

const emailSet = Boolean(process.env.WRM_WIX_EMAIL || process.env.WIX_EMAIL);
const passSet = Boolean(process.env.WRM_WIX_PASSWORD || process.env.WIX_PASSWORD);

const report = {
  ok: true,
  domain,
  newSitePreview: `${tip}${previewPath}`,
  previewHttpStatus: previewStatus,
  previewLive: previewOk,
  dnsStillOnWix: wixDns,
  nameservers: ns,
  wwwA: a,
  wixCredentialsOnThisProcess: { email: emailSet, password: passSet },
  next: !emailSet || !passSet
    ? 'Set WRM_WIX_EMAIL + WRM_WIX_PASSWORD on Railway (Dashboard or managed-env/bulk). Never paste password in chat.'
    : wixDns
      ? 'Creds present locally/process — on tip: release domain from Wix DNS (or change registrar NS) and point www/apex to Railway custom domain serving wellrounded-momma.'
      : 'DNS already off Wix — verify apex/www serve SiteBuilder preview HTML.',
};

console.log(JSON.stringify(report, null, 2));