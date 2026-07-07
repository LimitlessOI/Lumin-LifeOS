#!/usr/bin/env node
/**
 * SYNOPSIS: Wellness pilot — build up to 10 prospects via Site Builder API.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import 'dotenv/config';

const DEFAULT_PILOT = [
  { businessUrl: 'https://wellroundedmomma.com', businessName: 'Well Rounded Momma', industry: 'midwifery' },
];

function loadPilotList() {
  const raw = process.env.SITE_BUILDER_PILOT_JSON;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) throw new Error('SITE_BUILDER_PILOT_JSON must be a non-empty array');
    return parsed.slice(0, 10);
  }
  return DEFAULT_PILOT;
}

function resolveBaseUrl() {
  if (process.env.SITE_BASE_URL) return process.env.SITE_BASE_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${process.env.PORT || 8080}`;
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const commandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_COMMAND_KEY;
  if (!commandKey) {
    console.error('Missing COMMAND_CENTER_KEY (or LIFEOS_COMMAND_KEY) for authenticated /prospect calls.');
    process.exit(1);
  }

  const skipEmail = process.argv.includes('--skip-email');
  const dryRun = process.argv.includes('--dry-run');
  const prospects = loadPilotList();

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'execute',
    baseUrl,
    count: prospects.length,
    skipEmail,
  }));

  if (dryRun) process.exit(0);

  const results = [];
  for (const prospect of prospects) {
    const body = {
      businessUrl: prospect.businessUrl,
      contactEmail: prospect.contactEmail,
      contactName: prospect.contactName,
      businessName: prospect.businessName,
      skipEmail,
      businessInfo: prospect.industry ? { industry: prospect.industry, ...(prospect.businessInfo || {}) } : prospect.businessInfo,
    };

    const response = await fetch(`${baseUrl}/api/v1/sites/prospect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': commandKey,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    results.push({
      businessUrl: prospect.businessUrl,
      ok: response.ok && payload.ok !== false,
      status: response.status,
      clientId: payload.clientId || null,
      previewUrl: payload.previewUrl || null,
      emailSent: payload.emailSent,
      qaHold: payload.qaHold,
      error: payload.error || null,
    });
  }

  const summary = {
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
