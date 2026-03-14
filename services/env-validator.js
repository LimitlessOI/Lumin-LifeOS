/**
 * Startup environment variable validator.
 * Call validateEnv() before server starts. Logs warnings for optional vars,
 * throws for required vars so Railway redeploy catches misconfigurations immediately.
 */

const REQUIRED = [
  { key: 'DATABASE_URL', desc: 'Neon PostgreSQL connection string' },
  { key: 'ANTHROPIC_API_KEY', desc: 'Claude AI API key' },
  { key: 'COMMAND_CENTER_KEY', desc: 'API authentication key for all routes' },
];

const OPTIONAL_WITH_WARNINGS = [
  { key: 'POSTMARK_SERVER_TOKEN', desc: 'Email sending disabled — cold prospect emails will not send', feature: 'Site Builder cold email' },
  { key: 'EMAIL_FROM', desc: 'Email sending disabled — no From address configured', feature: 'Site Builder cold email' },
  { key: 'SITE_BASE_URL', desc: 'Preview links in emails will be broken', feature: 'Site Builder previews' },
  { key: 'STRIPE_SECRET_KEY', desc: 'Stripe payments disabled', feature: 'Billing' },
  { key: 'OPENAI_API_KEY', desc: 'OpenAI fallback disabled', feature: 'AI Council fallback' },
  { key: 'AFFILIATE_JANE_APP_URL', desc: 'Using default Jane App URL — no commission tracking', feature: 'POS commission' },
  { key: 'AFFILIATE_MINDBODY_URL', desc: 'Using default Mindbody URL — no commission tracking', feature: 'POS commission' },
  { key: 'AFFILIATE_SQUARE_URL', desc: 'Using default Square URL — no commission tracking', feature: 'POS commission' },
  { key: 'TWILIO_ACCOUNT_SID', desc: 'SMS/call alerts disabled', feature: 'Alerts' },
  { key: 'GITHUB_TOKEN', desc: 'Auto-commit disabled', feature: 'Auto-builder' },
  { key: 'REPLICATE_API_TOKEN', desc: 'Video pipeline disabled', feature: 'Video' },
  { key: 'REDIS_URL', desc: 'BullMQ will use in-memory (not persistent)', feature: 'Queue' },
];

export function validateEnv(logger) {
  const missing = [];

  for (const { key, desc } of REQUIRED) {
    if (!process.env[key]) {
      missing.push(`  ❌ ${key} — ${desc}`);
    }
  }

  if (missing.length > 0) {
    const msg = `\n[ENV] FATAL: Missing required environment variables:\n${missing.join('\n')}\n`;
    if (logger) logger.error(msg);
    else console.error(msg);
    throw new Error(`Missing required env vars: ${missing.map(m => m.trim().split(' ')[1]).join(', ')}`);
  }

  const warnings = [];
  for (const { key, desc, feature } of OPTIONAL_WITH_WARNINGS) {
    if (!process.env[key]) {
      warnings.push({ key, desc, feature });
    }
  }

  if (warnings.length > 0) {
    const log = logger || console;
    log.warn('[ENV] Optional env vars not set (features degraded):');
    for (const { key, feature, desc } of warnings) {
      log.warn(`  ⚠️  ${key} not set — ${feature}: ${desc}`);
    }
  }

  if (logger) logger.info('[ENV] Environment validation passed');
  return true;
}
