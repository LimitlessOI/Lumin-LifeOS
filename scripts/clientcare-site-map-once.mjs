#!/usr/bin/env node
/**
 * SYNOPSIS: One-shot ClientCare site-map crawl in killable child (tip CDP wedge safe).
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 *
 * Usage: CC_SITE_MAP_ARGS='{"scope":"billing","maxPages":20}' node scripts/clientcare-site-map-once.mjs
 */
import { createClientCareBrowserService } from '../services/clientcare-browser-service.js';

const args = JSON.parse(process.env.CC_SITE_MAP_ARGS || '{}');
const logger = {
  info: (...a) => console.error('[cc-site-map]', ...a),
  warn: (...a) => console.error('[cc-site-map:warn]', ...a),
  error: (...a) => console.error('[cc-site-map:err]', ...a),
  log: (...a) => console.error('[cc-site-map]', ...a),
};

const browserService = createClientCareBrowserService({ env: process.env, logger });
const onProgress = (partial) => {
  try {
    console.error('[cc-site-map:progress]', JSON.stringify(partial));
  } catch (_) { /* ignore */ }
};

const hardExit = (code) => {
  try { process.stdout.write('\n'); } catch (_) { /* ignore */ }
  setTimeout(() => process.exit(code), 50);
  try { process.exit(code); } catch (_) { /* ignore */ }
};

try {
  const result = await browserService.crawlSiteMap({ ...args, onProgress });
  process.stdout.write(JSON.stringify(result));
  hardExit(result?.ok ? 0 : 2);
} catch (err) {
  process.stdout.write(JSON.stringify({
    ok: false,
    error: String(err?.message || err).slice(0, 300),
  }));
  hardExit(1);
}
