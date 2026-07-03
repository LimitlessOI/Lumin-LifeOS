#!/usr/bin/env node
/**
 * SYNOPSIS: Sync founder login locally via DATABASE_URL (no deploy required).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import pg from 'pg';
import { hashPassword } from '../services/lifeos-auth.js';

const { Pool } = pg;

function isValidEmail(email) {
  const e = String(email || '').trim();
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function main() {
  const email = String(process.env.LIFEOS_FOUNDER_LOGIN_EMAIL || '').trim();
  const password = String(process.env.LIFEOS_FOUNDER_LOGIN_PASSWORD || '');
  const handle = String(process.env.LIFEOS_FOUNDER_LOGIN_HANDLE || 'adam').trim().toLowerCase();
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error(JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }));
    process.exit(1);
  }
  if (!isValidEmail(email) || password.length < 8) {
    console.error(JSON.stringify({
      ok: false,
      error: 'Set LIFEOS_FOUNDER_LOGIN_EMAIL + LIFEOS_FOUNDER_LOGIN_PASSWORD (8+ chars)',
    }));
    process.exit(1);
  }

  const started = Date.now();
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const phash = hashPassword(password);
  const { rows } = await pool.query(
    `UPDATE lifeos_users
     SET password_hash = $1, email = LOWER($2), active = TRUE
     WHERE LOWER(user_handle) = LOWER($3)
     RETURNING id, user_handle, display_name, email, role, tier`,
    [phash, email, handle]
  );
  await pool.end();

  if (!rows.length) {
    console.error(JSON.stringify({ ok: false, error: `handle not found: ${handle}` }));
    process.exit(1);
  }

  const base = (process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app').replace(/\/$/, '');
  let login_probe = null;
  try {
    const res = await fetch(`${base}/api/v1/lifeos/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    login_probe = { ok: res.ok && data.ok, status: res.status, handle: data.user?.user_handle || null, error: data.error || null };
  } catch (e) {
    login_probe = { ok: false, error: e.message };
  }

  console.log(JSON.stringify({
    ok: login_probe?.ok === true,
    user: rows[0],
    login_probe,
    duration_ms: Date.now() - started,
    login_url: `${base}/overlay/lifeos-login.html?next=${encodeURIComponent('/overlay/lifeos-app.html?direct_system=1')}`,
  }, null, 2));
  process.exit(login_probe?.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
