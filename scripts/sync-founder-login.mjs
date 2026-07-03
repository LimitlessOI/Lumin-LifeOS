#!/usr/bin/env node
/**
 * SYNOPSIS: Sync founder LifeOS login email+password from Railway vault to adam user row.
 * Reads LIFEOS_FOUNDER_LOGIN_EMAIL + LIFEOS_FOUNDER_LOGIN_PASSWORD (never prints secrets).
 *
 * Usage:
 *   node scripts/sync-founder-login.mjs --via-api
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import { resolvePublicBaseUrl } from '../config/public-origin.js';

const base = resolvePublicBaseUrl(process.env.PUBLIC_BASE_URL);
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

async function main() {
  if (!base || !key) {
    console.error(JSON.stringify({ ok: false, error: 'PUBLIC_BASE_URL and COMMAND_CENTER_KEY required' }));
    process.exit(1);
  }
  const res = await fetch(`${base}/api/v1/lifeos/auth/operator/sync-founder-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-command-key': key,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  console.log(JSON.stringify(data, null, 2));
  if (!res.ok || !data.ok) process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
