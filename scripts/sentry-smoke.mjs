/**
 * SYNOPSIS: SENTRY Reality Station smoke test against live BuilderOS.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { runSentryRealityStation } from '../services/sentry-reality-station.mjs';

const baseUrl = String(process.env.BUILDER_BASE_URL
  || process.env.PUBLIC_BASE_URL
  || 'https://lumin-web-production-e3a9.up.railway.app').trim();

const COMMAND_KEY = process.env.COMMAND_CENTER_KEY;

const http = async ({ method = 'GET', path, headers = {} }) => {
  const url = /^https?:\/\//i.test(path) ? path : `${baseUrl.replace(/\/$/, '')}${path}`;
  try {
    const res = await fetch(url, { method, headers });
    return { status: res.status };
  } catch (err) {
    return { status: 0, error: String(err?.message || err) };
  }
};

const result = await runSentryRealityStation({
  step: { id: 'sentry-smoke' },
  baseUrl,
  layerA: {
    runner: { http },
    assertions: [
      { type: 'http_status', path: '/api/v1/lifeos/builder/ready', expect_status: [200], headers: COMMAND_KEY ? { 'x-command-key': COMMAND_KEY } : {} },
    ],
  },
  requireLayerB: false,
});

console.log(JSON.stringify({
  pass: result.pass,
  receipt_path: result.receiptPath,
  findings: result.receipt.findings,
}, null, 2));

process.exit(result.pass ? 0 : 1);
