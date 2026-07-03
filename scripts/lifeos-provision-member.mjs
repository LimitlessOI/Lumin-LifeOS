#!/usr/bin/env node
/**
 * SYNOPSIS: Provision a LifeOS member account (invite and/or user row + optional household link to Adam).
 * Provision a LifeOS member account (invite and/or user row + optional household link to Adam).
 * Uses DATABASE_URL — run from operator shell with Neon/Railway credentials.
 *
 * Examples:
 *   node scripts/lifeos-provision-member.mjs --invite-only --label sherry
 *   node scripts/lifeos-provision-member.mjs --handle sherry --email sherry@example.com --display-name Sherry --password 'ChangeMeNow1!' --link-adam
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'node:crypto';
import { hashPassword } from '../services/lifeos-auth.js';

dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname, override: true });

const { Pool } = pg;

function parseArgs(argv) {
  const out = {
    inviteOnly: false,
    handle: '',
    email: '',
    displayName: '',
    password: '',
    linkAdam: false,
    label: 'member',
    tier: 'premium',
    role: 'member',
    days: 90,
    cleanupHandle: '',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--invite-only') out.inviteOnly = true;
    else if (a === '--handle' && next) { out.handle = next; i++; }
    else if (a === '--email' && next) { out.email = next; i++; }
    else if (a === '--display-name' && next) { out.displayName = next; i++; }
    else if (a === '--password' && next) { out.password = next; i++; }
    else if (a === '--label' && next) { out.label = next; i++; }
    else if (a === '--tier' && next) { out.tier = next; i++; }
    else if (a === '--role' && next) { out.role = next; i++; }
    else if (a === '--days' && next) { out.days = parseInt(next, 10) || 90; i++; }
    else if (a === '--link-adam') out.linkAdam = true;
    else if (a === '--cleanup-handle' && next) { out.cleanupHandle = next; i++; }
  }
  return out;
}

async function resolveAdamId(client) {
  const { rows } = await client.query(
    `SELECT id FROM lifeos_users WHERE LOWER(user_handle) = 'adam' LIMIT 1`
  );
  return rows[0]?.id || null;
}

async function cleanupUser(client, handle) {
  if (!handle) return;
  const { rows } = await client.query(
    `SELECT id FROM lifeos_users WHERE LOWER(user_handle) = LOWER($1)`,
    [handle]
  );
  const id = rows[0]?.id;
  if (!id) return { removed: false, reason: 'not_found' };
  await client.query(`DELETE FROM lifeos_sessions WHERE user_id = $1`, [id]);
  await client.query(`UPDATE lifeos_invites SET used_by = NULL, used_at = NULL WHERE used_by = $1`, [id]);
  await client.query(`DELETE FROM lifeos_users WHERE id = $1`, [id]);
  return { removed: true, id };
}

async function main() {
  const args = parseArgs(process.argv);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('HALT: DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    if (args.cleanupHandle) {
      const cleaned = await cleanupUser(client, args.cleanupHandle);
      console.log(JSON.stringify({ cleanup: cleaned }, null, 2));
    }

    const adamId = await resolveAdamId(client);
    if (!adamId) throw new Error('adam user row not found in lifeos_users');

    if (args.inviteOnly || (!args.email && !args.password)) {
      const code = `LOS-${args.label.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const { rows: [inv] } = await client.query(
        `INSERT INTO lifeos_invites (code, role, tier, email, expires_at, created_by)
         VALUES ($1, $2, $3, $4, NOW() + ($5 || ' days')::INTERVAL, $6)
         RETURNING id, code, role, tier, email, expires_at`,
        [
          code,
          args.role,
          args.tier,
          args.email ? args.email.trim().toLowerCase() : null,
          String(args.days),
          adamId,
        ]
      );
      const base = (process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app').replace(/\/$/, '');
      console.log(JSON.stringify({
        ok: true,
        mode: 'invite',
        invite: inv,
        signup_url: `${base}/overlay/lifeos-login.html?invite=${encodeURIComponent(code)}`,
        instructions: 'Sherry opens signup URL, creates her own password. Not COMMAND_CENTER_KEY.',
      }, null, 2));
      return;
    }

    if (!args.handle || !args.email || !args.password) {
      throw new Error('--handle, --email, and --password required for full account provision');
    }
    if (args.password.length < 8) throw new Error('password must be at least 8 characters');

    const slug = args.handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!slug) throw new Error('invalid handle');

    await client.query('BEGIN');

    const { rows: existing } = await client.query(
      `SELECT id FROM lifeos_users WHERE email = LOWER($1) OR LOWER(user_handle) = LOWER($2)`,
      [args.email.trim(), slug]
    );
    if (existing.length) throw new Error('email or handle already taken');

    const phash = hashPassword(args.password);
    const { rows: [user] } = await client.query(
      `INSERT INTO lifeos_users (user_handle, display_name, email, password_hash, role, tier, active)
       VALUES ($1, $2, LOWER($3), $4, $5, $6, TRUE)
       RETURNING id, user_handle, display_name, email, role, tier`,
      [slug, args.displayName || slug, args.email.trim(), phash, args.role, args.tier]
    );

    let link = null;
    if (args.linkAdam) {
      const { rows: [row] } = await client.query(
        `INSERT INTO household_links (user_id_a, user_id_b, relationship, permissions)
         VALUES ($1, $2, 'partner', '{}'::jsonb)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [Math.min(Number(adamId), Number(user.id)), Math.max(Number(adamId), Number(user.id))]
      );
      link = row || { note: 'link may already exist' };
    }

    await client.query('COMMIT');

    const base = (process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app').replace(/\/$/, '');
    console.log(JSON.stringify({
      ok: true,
      mode: 'account',
      user,
      household_link: link,
      login_url: `${base}/overlay/lifeos-login.html`,
      note: 'Give Sherry her email + password. She uses Login tab — not Voice Rail COMMAND_CENTER_KEY.',
    }, null, 2));
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
