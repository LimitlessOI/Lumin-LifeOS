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

async function pollProspectStatus(baseUrl, commandKey, clientId, maxWaitMs = 600000) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const res = await fetch(`${baseUrl}/api/v1/sites/prospects/${encodeURIComponent(clientId)}/status`, {
      headers: { 'x-command-key': commandKey },
    });
    const payload = await res.json().catch(() => ({}));
    if (payload.status === 'sent' || payload.status === 'failed') return payload;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return { status: 'timeout', clientId };
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
  const noPoll = process.argv.includes('--no-poll');
  const prospects = loadPilotList();

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'execute',
    baseUrl,
    count: prospects.length,
    skipEmail,
    noPoll,
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
      async: true,
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
    let final = payload;

    if (!noPoll && response.status === 202 && payload.clientId) {
      final = await pollProspectStatus(baseUrl, commandKey, payload.clientId);
    }

    results.push({
      businessUrl: prospect.businessUrl,
      ok: (response.status === 202 || response.ok) && final.status !== 'failed' && final.status !== 'timeout',
      httpStatus: response.status,
      clientId: payload.clientId || final.clientId || null,
      previewUrl: final.previewUrl || payload.previewUrl || null,
      jobStatus: final.status || payload.status || null,
      emailSent: final.emailSent ?? payload.emailSent,
      qaHold: final.qaHold ?? payload.qaHold,
      error: final.error || payload.error || null,
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
