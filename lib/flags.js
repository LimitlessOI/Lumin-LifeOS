/**
 * Feature Flags — environment-variable based
 *
 * Toggle features by setting Railway env vars without redeploying code.
 * Upgrade to Flagsmith (flagsmith.com) when you need per-user targeting or A/B tests.
 *
 * Usage:
 *   import { isEnabled, flags } from './lib/flags.js';
 *   if (isEnabled('VIDEO_GENERATION')) { ... }
 *
 * Railway: set FLAG_VIDEO_GENERATION=true to enable a flag.
 * Default is FALSE for all major features until explicitly enabled (fail-closed).
 */

const FLAGS = {
  // ── Product Builders ──────────────────────────────────────────────────────
  VIDEO_GENERATION:     process.env.FLAG_VIDEO_GENERATION     === 'true',
  GAME_BUILDER:         process.env.FLAG_GAME_BUILDER         === 'true',
  MOBILE_APP_BUILDER:   process.env.FLAG_MOBILE_APP_BUILDER   === 'true',

  // ── AI Pipeline ───────────────────────────────────────────────────────────
  IDEA_AUTO_IMPLEMENT:  process.env.FLAG_IDEA_AUTO_IMPLEMENT  === 'true',  // auto-deploy from pipeline
  INCOME_DRONES:        process.env.FLAG_INCOME_DRONES        === 'true',  // was DISABLE_INCOME_DRONES
  OPEN_SOURCE_COUNCIL:  process.env.FLAG_OPEN_SOURCE_COUNCIL  === 'true',  // Ollama local models

  // ── Revenue ───────────────────────────────────────────────────────────────
  TCO_SALES:            process.env.FLAG_TCO_SALES            !== 'false', // on by default
  STRIPE_LIVE:          process.env.FLAG_STRIPE_LIVE          === 'true',  // live Stripe mode

  // ── Integrations ─────────────────────────────────────────────────────────
  BOLDTRAIL_CRM:        process.env.FLAG_BOLDTRAIL_CRM        === 'true',
  VAPI_PHONE:           process.env.FLAG_VAPI_PHONE           === 'true',
  WHITE_LABEL:          process.env.FLAG_WHITE_LABEL          === 'true',

  // ── Safety ────────────────────────────────────────────────────────────────
  AUTONOMY_RUNNING:     process.env.FLAG_AUTONOMY_RUNNING     !== 'false', // on by default
  FSAR_GATING:          process.env.FLAG_FSAR_GATING          !== 'false', // on by default
};

/**
 * Check if a feature flag is enabled.
 * @param {string} flag - flag name (e.g. 'VIDEO_GENERATION')
 * @returns {boolean}
 */
export function isEnabled(flag) {
  if (!(flag in FLAGS)) {
    // Unknown flag — fail-closed
    return false;
  }
  return FLAGS[flag];
}

/**
 * Get all flag states (for debug/status endpoints).
 */
export function getAllFlags() {
  return { ...FLAGS };
}

export const flags = FLAGS;
