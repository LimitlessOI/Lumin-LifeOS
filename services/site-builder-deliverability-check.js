/**
 * SYNOPSIS: Exports checkDomainDeliverabilityDNS — services/site-builder-deliverability-check.js.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

export async function checkDomainDeliverabilityDNS(domain, { dkimSelector = 'default', resolveTxtFn } = {}) {
  const resolve = resolveTxtFn || ((name) => import('node:dns').then((dns) => dns.promises.resolveTxt(name)));
  if (!domain) {
    return { deliverabilityReady: false, deliverabilityBlockers: ['missing_domain'] };
  }
  const blockers = [];
  let spfFound = false;
  let dkimFound = false;
  try {
    const spfRecords = await resolve(domain);
    spfFound = spfRecords.some((rec) => rec.join('').toLowerCase().includes('v=spf1'));
  } catch (err) {
    blockers.push(`spf_lookup_failed:${err.code || err.message}`);
  }
  if (!spfFound) blockers.push('spf_record_not_found');
  try {
    const dkimRecords = await resolve(`${dkimSelector}._domainkey.${domain}`);
    dkimFound = dkimRecords.some((rec) => rec.join('').toLowerCase().includes('v=dkim1'));
  } catch (err) {
    blockers.push(`dkim_lookup_failed:${err.code || err.message}`);
  }
  if (!dkimFound) blockers.push('dkim_record_not_found');
  return {
    deliverabilityReady: spfFound && dkimFound,
    deliverabilityBlockers: blockers,
  };
}