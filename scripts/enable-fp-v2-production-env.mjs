#!/usr/bin/env node
/**
 * SYNOPSIS: Push FP V2 production env defaults to Railway managed env (lane intel + prediction score).
 */
import process from 'node:process';

const base = String(process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '')
  .replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY;

if (!base || !key) {
  console.error('enable-fp-v2-production-env: set PUBLIC_BASE_URL (or RAILWAY_PUBLIC_DOMAIN) + COMMAND_CENTER_KEY');
  process.exit(1);
}

const vars = {
  CHAIR_PREDICTION_SCORE_ENABLED: '1',
  LANE_INTEL_ENABLED: '1',
  LANE_INTEL_ENABLE_SCHEDULED: '1',
};

const res = await fetch(`${base}/api/v1/railway/managed-env/bulk`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-command-key': key,
  },
  body: JSON.stringify({ vars }),
});

const json = await res.json().catch(() => ({}));
if (!res.ok || json.ok === false) {
  console.error('enable-fp-v2-production-env FAIL:', json.error || res.status);
  process.exit(1);
}

console.log('enable-fp-v2-production-env PASS:', Object.keys(vars).join(', '));
if (json.sync?.ok === false) {
  console.warn('sync note:', json.sync.error || 'sync pending — redeploy may be needed');
}
