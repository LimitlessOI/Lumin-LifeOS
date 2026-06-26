-- SYNOPSIS: Exports up — db/migrations/20260626_socialmediaos.sql.
// src/db/migrations/001_create_socialmediaos_tables.js
import { pool } from '../../core/database.js'; // adjust import as per existing pattern

export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // socialmediaos_sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS socialmediaos_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMPTZ,
        delivery_scheduled_at TIMESTAMPTZ,
        delivery_status TEXT DEFAULT 'not_sent',
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // indexes for socialmediaos_sessions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_owner_id
        ON socialmediaos_sessions (owner_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_status
        ON socialmediaos_sessions (status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_delivery_status
        ON socialmediaos_sessions (delivery_status);
    `);

    // socialmediaos_content_packs
    await client.query(`
      CREATE TABLE IF NOT EXISTS socialmediaos_content_packs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        delivery_scheduled_at TIMESTAMPTZ,
        delivery_status TEXT DEFAULT 'not_sent',
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // indexes for socialmediaos_content_packs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_owner_id
        ON socialmediaos_content_packs (owner_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_status
        ON socialmediaos_content_packs (status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_delivery_status
        ON socialmediaos_content_packs (delivery_status);
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}