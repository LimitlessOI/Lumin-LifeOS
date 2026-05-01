#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Live remote smoke for Site Builder.
 *
 * Verifies the real Railway route can build a preview and returns the quality gate payload
 * that downstream outreach logic depends on.
 */

import 'dotenv/config';

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  process.env.SITE_BASE_URL ||
  ''
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

if (!base) {
  console.error('PUBLIC_BASE_URL (or BUILDER_BASE_URL / SITE_BASE_URL) is required');
  process.exit(2);
}

if (!key) {
  console.error('COMMAND_CENTER_KEY (or COMMAND_KEY / LIFEOS_KEY / API_KEY) is required');
  process.exit(2);
}

const payload = {
  businessUrl: 'https://example.com',
  skipEmail: true,
  businessInfo: {
    businessName: 'Smoke Test Wellness',
    industry: 'wellness',
    services: ['Massage Therapy', 'Wellness Coaching'],
    location: 'Austin, TX',
    targetAudience: 'busy professionals',
    tone: 'calm and credible',
    bookingUrl: 'https://example.com/book',
  },
};

const res = await fetch(`${base}/api/v1/sites/build`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-command-key': key,
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error(`Unexpected non-JSON response from ${base}/api/v1/sites/build`);
  console.error(text.slice(0, 1000));
  process.exit(1);
}

const qualityReport = json?.qualityReport || json?.metadata?.qualityReport || null;
const previewUrl = json?.previewUrl || json?.metadata?.previewUrl || null;

if (!res.ok || !json?.ok || !previewUrl) {
  console.error(JSON.stringify({
    ok: false,
    status: res.status,
    error: json?.error || 'build failed',
    previewUrl,
  }, null, 2));
  process.exit(1);
}

if (!qualityReport) {
  console.error(JSON.stringify({
    ok: false,
    status: res.status,
    previewUrl,
    error: 'qualityReport missing from live Site Builder response',
    responseKeys: Object.keys(json || {}),
    metadataKeys: Object.keys(json?.metadata || {}),
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  status: res.status,
  previewUrl,
  scorePct: qualityReport.scorePct,
  grade: qualityReport.grade,
  readyToSend: qualityReport.readyToSend,
  recommendedAction: qualityReport.recommendedAction,
}, null, 2));
