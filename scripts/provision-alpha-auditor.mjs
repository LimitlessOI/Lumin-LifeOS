#!/usr/bin/env node
/**
 * SYNOPSIS: Provision founder-level alpha auditor test account for UI/build chat testing.
 * Provision founder-level alpha auditor test account for UI/build chat testing.
 * Reads throwaway creds from env (never prints secrets).
 *
 * Env resolution (first match wins — GUESS order, see script header in AMENDMENT_21):
 *   GMAIL_SIGNUP_EMAIL + GMAIL_SIGNUP_APP_PASSWORD
 *   ALPHA_TEST_EMAIL + ALPHA_TEST_PASSWORD
 *   WORK_EMAIL + WORK_EMAIL_APP_PASSWORD
 *
 * Usage:
 *   node scripts/provision-alpha-auditor.mjs
 *   node scripts/provision-alpha-auditor.mjs --via-api
 *   node scripts/provision-alpha-auditor.mjs --disable
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import dotenv from 'dotenv';
import pg from 'pg';
import { hashPassword } from '../services/lifeos-auth.js';

dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname, override: true });

const { Pool } = pg;

const HANDLE = (process.env.ALPHA_TEST_HANDLE || 'alpha-auditor').trim().toLowerCase();
const DISPLAY = process.env.ALPHA_TEST_DISPLAY_NAME || 'Alpha Auditor';
const ROLE = 'founder_admin';
const TIER = 'premium';

function isValidTestEmail(email) {
  const e = String(email || '').trim();
  if (!e || e === 'null' || e === 'undefined') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function resolveAlphaCreds() {
  const pairs = [
    ['GMAIL_SIGNUP_EMAIL', 'GMAIL_SIGNUP_APP_PASSWORD'],
    ['ALPHA_TEST_EMAIL', 'ALPHA_TEST_PASSWORD'],
    ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
  ];
  for (const [emailKey, passKey] of pairs) {
    const email = String(process.env[emailKey] || '').trim();
    const password = String(process.env[passKey] || '');
    if (isValidTestEmail(email) && password.length >= 8) {
      return { email, password, source: `${emailKey}+${passKey}` };
    }
  }
  return null;
}

async function provisionViaApi(base, key) {
  const res = await fetch(`${base}/api/v1/lifeos/auth/operator/provision-alpha-auditor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-command-key': key,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function provisionViaDb(pool, creds) {
  const client = await pool.connect();
  try {
    const slug = HANDLE.replace(/[^a-z0-9_-]/g, '');
    if (!slug) throw new Error('invalid handle');

    const { rows: existing } = await client.query(
      `SELECT id, user_handle, email, role, tier, active FROM lifeos_users
       WHERE LOWER(user_handle) = LOWER($1) OR email = LOWER($2)`,
      [slug, creds.email.trim()]
    );

    if (existing.length) {
      const row = existing[0];
      const phash = hashPassword(creds.password);
      await client.query(
        `UPDATE lifeos_users
         SET password_hash = $1, role = $2, tier = $3, active = TRUE, display_name = $4, email = LOWER($5)
         WHERE id = $6`,
        [phash, ROLE, TIER, DISPLAY, creds.email.trim(), row.id]
      );
      return {
        ok: true,
        mode: 'updated',
        user: {
          id: row.id,
          user_handle: row.user_handle,
          email: row.email,
          role: ROLE,
          tier: TIER,
        },
        note: 'Existing row upgraded to founder_admin for build testing.',
      };
    }

    const phash = hashPassword(creds.password);
    const { rows: [user] } = await client.query(
      `INSERT INTO lifeos_users (user_handle, display_name, email, password_hash, role, tier, active)
       VALUES ($1, $2, LOWER($3), $4, $5, $6, TRUE)
       RETURNING id, user_handle, display_name, email, role, tier`,
      [slug, DISPLAY, creds.email.trim(), phash, ROLE, TIER]
    );
    return { ok: true, mode: 'created', user };
  } finally {
    client.release();
  }
}

async function disableAccount(pool) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, user_handle, email, active FROM lifeos_users WHERE LOWER(user_handle) = LOWER($1)`,
      [HANDLE]
    );
    if (!rows.length) return { ok: true, mode: 'not_found', handle: HANDLE };
    await client.query(`DELETE FROM lifeos_sessions WHERE user_id = $1`, [rows[0].id]);
    await client.query(`UPDATE lifeos_users SET active = FALSE WHERE id = $1`, [rows[0].id]);
    return { ok: true, mode: 'disabled', user: rows[0] };
  } finally {
    client.release();
  }
}

async function main() {
  const viaApi = process.argv.includes('--via-api');
  const disable = process.argv.includes('--disable');
  const base = (process.env.PUBLIC_BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

  if (disable) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error(JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }));
      process.exit(1);
    }
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    const result = await disableAccount(pool);
    await pool.end();
    console.log(JSON.stringify({ ...result, handle: HANDLE }, null, 2));
    return;
  }

  if (viaApi) {
    if (!key) {
      console.error(JSON.stringify({ ok: false, error: 'COMMAND_CENTER_KEY required for --via-api' }));
      process.exit(1);
    }
    const data = await provisionViaApi(base, key);
    console.log(JSON.stringify({
      ...data,
      login_url: `${base}/overlay/lifeos-login.html?next=${encodeURIComponent('/lifeos?direct_system=1')}`,
      cred_source: 'server_env',
      confidence: 'THINK — server reads GMAIL_SIGNUP_* or ALPHA_TEST_* from Railway vault',
    }, null, 2));
    return;
  }

  const creds = resolveAlphaCreds();
  if (!creds) {
    if (key) {
      try {
        const data = await provisionViaApi(base, key);
        console.log(JSON.stringify({
          ...data,
          login_url: `${base}/overlay/lifeos-login.html?next=${encodeURIComponent('/lifeos?direct_system=1')}`,
          cred_source: 'server_env_via_api',
        }, null, 2));
        return;
      } catch (e) {
        console.error(JSON.stringify({
          ok: false,
          error: e.message,
          hint: 'Local creds missing and server route not available yet — deploy then rerun, or set GMAIL_SIGNUP_* in .env',
        }, null, 2));
        process.exit(1);
      }
    }
    console.error(JSON.stringify({
      ok: false,
      error: 'No alpha test creds in local env and no COMMAND_CENTER_KEY for API fallback',
    }, null, 2));
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }));
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const result = await provisionViaDb(pool, creds);
  await pool.end();

  console.log(JSON.stringify({
    ...result,
    handle: HANDLE,
    role: ROLE,
    tier: TIER,
    cred_source: creds.source,
    confidence: 'THINK — guessed env var pair from registry; verify login manually',
    login_url: `${base}/overlay/lifeos-login.html?next=${encodeURIComponent('/lifeos?direct_system=1')}`,
    app_url: `${base}/lifeos?direct_system=1`,
    disable_hint: 'node scripts/provision-alpha-auditor.mjs --disable',
  }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
