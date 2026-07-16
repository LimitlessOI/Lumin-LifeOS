#!/usr/bin/env node
/**
 * SYNOPSIS: One-shot ClientCare HCFA file in an isolated process (killable if Chromium wedges).
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 *
 * Usage: CC_FILE_ARGS='{"pregnancyId":"...","patientQuery":"Alvarado"}' node scripts/clientcare-file-hcfa-once.mjs
 * Prints one JSON object to stdout.
 */
import { createClientCareBrowserService } from '../services/clientcare-browser-service.js';

const args = JSON.parse(process.env.CC_FILE_ARGS || '{}');
const logger = {
  info: (...a) => console.error('[cc-file-hcfa]', ...a),
  warn: (...a) => console.error('[cc-file-hcfa:warn]', ...a),
  error: (...a) => console.error('[cc-file-hcfa:err]', ...a),
  log: (...a) => console.error('[cc-file-hcfa]', ...a),
};

const browserService = createClientCareBrowserService({ env: process.env, logger });
const onProgress = (partial) => {
  try {
    console.error('[cc-file-hcfa:progress]', JSON.stringify(partial));
  } catch (_) { /* ignore */ }
};

const hardExit = (code) => {
  try { process.stdout.write('\n'); } catch (_) { /* ignore */ }
  // Tip: session.close after Generate can wedge forever — never wait for clean teardown.
  setTimeout(() => process.exit(code), 50);
  try { process.exit(code); } catch (_) { /* ignore */ }
};

try {
  const result = await browserService.fileSuperBillClaim({ ...args, onProgress });
  process.stdout.write(JSON.stringify(result));
  hardExit(result?.filed || result?.ok || result?.formatPass ? 0 : 2);
} catch (err) {
  process.stdout.write(JSON.stringify({
    ok: false,
    error: String(err?.message || err).slice(0, 300),
  }));
  hardExit(1);
}
