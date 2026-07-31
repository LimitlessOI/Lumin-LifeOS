#!/usr/bin/env node
/**
 * SYNOPSIS: Verify SMOS $49 pack live charge capability without executing a real charge.
 * Checks Stripe configuration, pricing config, and service wiring. Writes readiness doc.
 * Never creates a real charge or checkout session.
 * @ssot docs/products/financial-revenue/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = path.join(ROOT, 'docs/products/financial-revenue/SMOS_REVENUE_READINESS.md');

const EXPECTED_CENTS = 4900;

function readEnv() {
  return {
    stripeSecret: String(process.env.STRIPE_SECRET_KEY || '').trim(),
    stripePublishable: String(process.env.STRIPE_PUBLISHABLE_KEY || '').trim(),
    smosPackCents: Number(process.env.SMOS_PACK_CENTS || 4900),
    baseUrl: String(process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '').trim(),
  };
}

async function verify() {
  const env = readEnv();
  const result = {
    schema: 'smos_live_charge_verify_v1',
    at: new Date().toISOString(),
    expected_amount_cents: EXPECTED_CENTS,
    amount_cents: env.smosPackCents,
    amount_match: env.smosPackCents === EXPECTED_CENTS,
    stripe_secret_set: Boolean(env.stripeSecret),
    stripe_publishable_set: Boolean(env.stripePublishable),
    base_url_set: Boolean(env.baseUrl),
    configured: false,
    reason: '',
  };

  const missing = [];
  if (!env.stripeSecret) missing.push('STRIPE_SECRET_KEY');
  if (!env.stripePublishable) missing.push('STRIPE_PUBLISHABLE_KEY');
  if (!env.baseUrl) missing.push('PUBLIC_BASE_URL or BASE_URL');

  if (missing.length) {
    result.configured = false;
    result.reason = `Missing env keys: ${missing.join(', ')}`;
    return result;
  }

  if (!result.amount_match) {
    result.configured = false;
    result.reason = `SMOS pack price ${env.smosPackCents} cents does not equal expected ${EXPECTED_CENTS} cents`;
    return result;
  }

  // Validate that the Stripe client can be imported/initialized.
  try {
    const { getStripeClient } = await import('../services/stripe-client.js');
    const stripe = await getStripeClient();
    if (!stripe) {
      result.configured = false;
      result.reason = 'STRIPE_SECRET_KEY set but getStripeClient() returned null (key invalid or stripe package missing)';
      return result;
    }

    // Non-mutating probe: list products to prove key works.
    const products = await stripe.products.list({ limit: 1 });
    result.stripe_api_reachable = products?.data !== undefined;
  } catch (err) {
    result.configured = false;
    result.reason = `Stripe API probe failed: ${err.message}`;
    return result;
  }

  // Validate that the SMOS checkout service can be imported (no execution).
  try {
    const smos = await import('../services/smos-pack-checkout.js');
    result.checkout_service_imports = Boolean(smos.createSmosPackCheckoutSession && smos.isSessionPaid);
  } catch (err) {
    result.configured = false;
    result.reason = `services/smos-pack-checkout.js import failed: ${err.message}`;
    return result;
  }

  result.configured = true;
  result.reason = 'Stripe and SMOS checkout wiring are configured and reachable; no real charge executed';
  return result;
}

function writeReadiness(verdict) {
  const emailOk = verdict.email.configured ? 'READY' : 'BLOCKED';
  const chargeOk = verdict.charge.configured ? 'READY' : 'BLOCKED';
  const overall = emailOk === 'READY' && chargeOk === 'READY' ? 'READY' : 'NOT_READY';
  const md = `<!-- SYNOPSIS: SMOS revenue readiness snapshot -- automatically updated by scripts/verify-smos-email-provider.mjs and scripts/verify-smos-live-charge.mjs -->\n# SMOS Revenue Readiness\n\n| Field | Value |\n|---|---|\n| **Generated** | ${new Date().toISOString()} |\n| **Overall** | ${overall} |\n| **Email provider** | ${emailOk} (${verdict.email.provider || 'none'}) |\n| **Live charge capability** | ${chargeOk} |\n\n## Email provider verdict\n\n\`\`\`json\n${JSON.stringify(verdict.email, null, 2)}\n\`\`\`\n\n## Live charge verdict\n\n\`\`\`json\n${JSON.stringify(verdict.charge, null, 2)}\n\`\`\`\n\n## Required founder credentials\n\n- For email: \`EMAIL_PROVIDER\` (resend|postmark|smtp|disabled), \`EMAIL_FROM\`, and provider key:\n  - resend → \`RESEND_API_KEY\`\n  - postmark → \`POSTMARK_SERVER_TOKEN\`\n  - smtp → \`SMTP_USER\` + \`SMTP_PASS\` (and optionally \`SMTP_HOST\`, \`SMTP_PORT\`)\n- For the $49 SMOS pack: \`STRIPE_SECRET_KEY\` and \`STRIPE_PUBLISHABLE_KEY\` must be set.\n\n## Execution gate\n\nThis script does **not** send email or charge cards. A real $49 charge requires founder\nexplicit approval after this readiness report shows READY. Do not enable automated\ncharging until SENTRY Layer A+B has verified the checkout flow end-to-end.\n`;
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, md);
}

async function main() {
  const charge = await verify();

  // Merge with existing email verdict if present
  let email = { schema: 'smos_email_provider_verify_v1', configured: false, reason: 'run scripts/verify-smos-email-provider.mjs' };
  if (fs.existsSync(OUT_PATH)) {
    try {
      const existing = fs.readFileSync(OUT_PATH, 'utf8');
      const match = existing.match(/## Email provider verdict\s*\n```json\s*\n([\s\S]*?)\n```/);
      if (match) email = JSON.parse(match[1]);
    } catch { /* ignore parse errors */ }
  }

  const verdict = { email, charge };
  writeReadiness(verdict);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
