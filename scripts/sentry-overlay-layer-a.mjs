#!/usr/bin/env node
/**
 * SYNOPSIS: Universal Overlay SENTRY Layer A — structural HTTP probes, no browser.
 * Fail-closed. Every finding carries a proposed_solution (SO-002).
 *
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePublicBaseUrl } from '../config/public-origin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/SENTRY_OVERLAY_LAYER_A.json');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
const BASE = resolvePublicBaseUrl(
  process.env.PUBLIC_BASE_URL,
  process.env.SITE_BASE_URL,
  process.env.BASE_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
) || 'https://lumin-web-production-e3a9.up.railway.app';

async function probe(pathname, { key = false } = {}) {
  const headers = {};
  if (key && KEY) {
    headers['x-command-key'] = KEY;
    headers['x-command-center-key'] = KEY;
  }
  const res = await fetch(`${BASE}${pathname}`, { headers, redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, text: text.slice(0, 400), ok: res.ok };
}

function finding(code, detail, proposed_solution) {
  return { code, detail, proposed_solution };
}

async function main() {
  const findings = [];
  const results = {};

  async function check(id, fn) {
    try {
      results[id] = await fn();
    } catch (err) {
      const detail = String(err?.message || err).slice(0, 400);
      results[id] = { ok: false, error: detail };
      findings.push(finding(id, detail, `Investigate ${id} against ${BASE}.`));
    }
  }

  await check('overlay_app_html', async () => {
    const got = await probe('/overlay/lifeos-app.html');
    if (got.status !== 200) {
      findings.push(finding(
        'overlay_app_html',
        `GET /overlay/lifeos-app.html → HTTP ${got.status}`,
        'public/overlay/lifeos-app.html is the only active founder interface. Confirm the static mount still serves it from the founder-builder runtime lane.',
      ));
    }
    return got;
  });

  await check('lifeos_shell', async () => {
    const got = await probe('/lifeos');
    if (got.status !== 200) {
      findings.push(finding(
        'lifeos_shell',
        `GET /lifeos → HTTP ${got.status}`,
        'Taloa loads /lifeos in the badge WKWebView. Restore the /lifeos rewrite to public/overlay/lifeos-app.html.',
      ));
    }
    return got;
  });

  await check('overlay_host_health', async () => {
    const got = await probe('/api/v1/taloa/overlay-host/health', { key: true });
    if (got.status === 404 || got.status === 0) {
      findings.push(finding(
        'overlay_host_unwired',
        `GET /api/v1/taloa/overlay-host/health → HTTP ${got.status}. Phase 1 createOverlayHostService exists with no live route caller.`,
        'Ship BUILD_QUEUE TALOA-WIRE-HOST-001 (routes/taloa-overlay-host-routes.js) then TALOA-WIRE-HOST-REGISTER-001 (config/auto-registered-product-modules.json). Do not edit server.js. The route must import and call createOverlayHostService.',
      ));
    } else if (got.status === 401 || got.status === 403) {
      results.overlay_host_health = { ...got, ok: true, note: 'mounted_auth_gated' };
      return results.overlay_host_health;
    } else if (!got.ok) {
      findings.push(finding(
        'overlay_host_unhealthy',
        `GET /api/v1/taloa/overlay-host/health → HTTP ${got.status} ${got.text}`,
        'routes/taloa-overlay-host-routes.js must call createOverlayHostService({ pool, logger, preferenceStore }) and return a serialisable object. Check auto-register mount health.',
      ));
    }
    return got;
  });

  const ok = findings.length === 0;
  const report = {
    ok,
    layer: 'A',
    product: 'universal-overlay',
    base: BASE,
    at: new Date().toISOString(),
    results,
    findings,
  };
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
