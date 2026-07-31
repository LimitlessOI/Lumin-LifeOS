#!/usr/bin/env node
/**
 * SYNOPSIS: Verify the SMOS email-provider configuration without sending email.
 * Reads env/registry and optionally probes the provider API to prove the key is valid.
 * Never sends a real email.
 * @ssot docs/products/financial-revenue/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = path.join(ROOT, 'docs/products/financial-revenue/SMOS_REVENUE_READINESS.md');

const REQUEST_TIMEOUT_MS = 10000;

function providerName() {
  return String(process.env.EMAIL_PROVIDER || 'auto').toLowerCase().trim() || 'auto';
}

function fromAddress() {
  return (
    String(process.env.EMAIL_FROM || '').trim() ||
    String(process.env.RESEND_FROM || '').trim() ||
    String(process.env.SMTP_FROM || '').trim() ||
    String(process.env.WORK_EMAIL || '').trim() ||
    ''
  );
}

function creds() {
  const p = providerName();
  const from = fromAddress();
  const postmarkToken = String(process.env.POSTMARK_SERVER_TOKEN || '').trim();
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  const smtpUser = String(process.env.SMTP_USER || process.env.WORK_EMAIL || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || process.env.WORK_EMAIL_APP_PASSWORD || '').trim();
  const smtpHost = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  return {
    provider: p,
    from,
    postmarkToken,
    resendKey,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
  };
}

async function probeResend(key) {
  try {
    const resp = await fetch('https://api.resend.com/api-keys', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return { ok: resp.ok, status: resp.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function probePostmark(token) {
  try {
    const resp = await fetch('https://api.postmarkapp.com/server', {
      headers: {
        Accept: 'application/json',
        'X-Postmark-Server-Token': token,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return { ok: resp.ok, status: resp.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function determineProvider(c) {
  if (c.provider === 'disabled') return { provider: 'disabled', configured: true, reason: 'email explicitly disabled' };

  let selected = c.provider;
  if (selected === 'auto') {
    if (c.postmarkToken) selected = 'postmark';
    else if (c.resendKey) selected = 'resend';
    else if (c.smtpUser && c.smtpPass) selected = 'smtp';
    else selected = 'none';
  }

  const needs = [];
  if (!c.from) needs.push('EMAIL_FROM');
  if (selected === 'postmark' && !c.postmarkToken) needs.push('POSTMARK_SERVER_TOKEN');
  if (selected === 'resend' && !c.resendKey) needs.push('RESEND_API_KEY');
  if (selected === 'smtp' && (!c.smtpUser || !c.smtpPass)) needs.push('SMTP_USER/SMTP_PASS');

  if (selected === 'none' || needs.length) {
    return {
      provider: selected,
      configured: false,
      missing: needs,
      reason: `Missing env keys: ${needs.length ? needs.join(', ') : 'no email provider configured'}`,
    };
  }

  return { provider: selected, configured: true, reason: 'provider and from address configured' };
}

async function verify() {
  const c = creds();
  const base = determineProvider(c);
  const result = {
    schema: 'smos_email_provider_verify_v1',
    at: new Date().toISOString(),
    provider: base.provider,
    configured: base.configured,
    from_address: c.from || null,
    reason: base.reason,
    missing: base.missing || null,
  };

  if (base.configured && base.provider === 'resend' && c.resendKey) {
    const probe = await probeResend(c.resendKey);
    result.probe = probe;
    if (!probe.ok) {
      result.configured = false;
      result.reason = `RESEND_API_KEY present but API probe failed (status ${probe.status || probe.error})`;
    }
  }

  if (base.configured && base.provider === 'postmark' && c.postmarkToken) {
    const probe = await probePostmark(c.postmarkToken);
    result.probe = probe;
    if (!probe.ok) {
      result.configured = false;
      result.reason = `POSTMARK_SERVER_TOKEN present but API probe failed (status ${probe.status || probe.error})`;
    }
  }

  if (base.configured && base.provider === 'smtp') {
    result.smtp_ready = Boolean(c.smtpUser && c.smtpPass && c.smtpHost && c.smtpPort);
  }

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
  const email = await verify();

  // Merge with existing live-charge verdict if present
  let charge = { schema: 'smos_live_charge_verify_v1', configured: false, reason: 'run scripts/verify-smos-live-charge.mjs' };
  if (fs.existsSync(OUT_PATH)) {
    try {
      const existing = fs.readFileSync(OUT_PATH, 'utf8');
      const match = existing.match(/## Live charge verdict\s*\n```json\s*\n([\s\S]*?)\n```/);
      if (match) charge = JSON.parse(match[1]);
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
