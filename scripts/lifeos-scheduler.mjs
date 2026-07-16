#!/usr/bin/env node
/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: LifeOS relationship reminder scheduler — scripts/lifeos-scheduler.mjs.
 *
 * Runs on a weekly cron to scan relationship_contacts and queue reminders for
 * people the founder hasn't connected with recently.
 */
import 'dotenv/config';
import schedule from 'node-schedule';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const DEFAULT_USER_ID = 1; // adam

export const RELATIONSHIP_CONTACTS_TABLE = 'relationship_contacts';
export const RELATIONSHIP_REMINDERS_TABLE = 'relationship_reminders';

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS relationship_contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  frequency_days INT DEFAULT 7,
  last_contact_at TIMESTAMPTZ,
  next_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_contacts_user_id
  ON relationship_contacts (user_id);

CREATE TABLE IF NOT EXISTS relationship_reminders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES relationship_contacts(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  message TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_reminders_user_due
  ON relationship_reminders (user_id, due_at) WHERE sent = FALSE;
`;

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[lifeos-scheduler] DATABASE_URL not set; scheduler cannot run.');
    return null;
  }
  return new Pool({
    connectionString: url,
    ssl: url.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });
}

export async function ensureTables(pool) {
  if (!pool) return;
  await pool.query(CREATE_TABLES_SQL);
}

export async function queueUnconnectedContactReminders(pool, userId = DEFAULT_USER_ID) {
  if (!pool) return [];

  await ensureTables(pool);

  const { rows: contacts } = await pool.query(
    `SELECT id, name, relationship, frequency_days, last_contact_at
     FROM relationship_contacts
     WHERE user_id = $1
       AND (last_contact_at IS NULL OR last_contact_at < NOW() - (frequency_days || ' days')::interval)
     ORDER BY last_contact_at NULLS FIRST`,
    [userId],
  );

  const reminders = [];
  for (const c of contacts) {
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // queue for tomorrow
    const { rows } = await pool.query(
      `INSERT INTO relationship_reminders (user_id, contact_id, contact_name, message, due_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        c.id,
        c.name,
        `Reach out to ${c.name}${c.relationship ? ` (${c.relationship})` : ''} — it's been ${c.frequency_days} days.`,
        dueAt,
      ],
    );
    reminders.push(rows[0]);
  }

  // Push the next reminder window forward so the same contact isn't re-queued immediately.
  if (contacts.length) {
    const ids = contacts.map((c) => c.id);
    await pool.query(
      `UPDATE relationship_contacts
       SET next_reminder_at = NOW() + (frequency_days || ' days')::interval,
           updated_at = NOW()
       WHERE id = ANY($1)`,
      [ids],
    );
  }

  return reminders;
}

export async function scheduleRelationshipReminders(pool) {
  if (!pool) return;
  schedule.scheduleJob('0 9 * * 0', async () => {
    try {
      const result = await runNow(pool);
      console.log('[lifeos-scheduler] scheduled relationship reminder tick:', result);
    } catch (err) {
      console.error('[lifeos-scheduler] scheduled tick failed:', err.message);
    }
  });
}

export async function runNow(pool) {
  if (!pool) return { ok: false, error: 'no_pool' };
  const reminders = await queueUnconnectedContactReminders(pool);
  return { ok: true, reminders_queued: reminders.length, reminders };
}

export function startScheduler(pool) {
  scheduleRelationshipReminders(pool);

  if (!pool) {
    console.warn('[lifeos-scheduler] No pool; scheduler not started.');
    return null;
  }

  // Run weekly on Sunday at 09:00 in the server's local time.
  const job = schedule.scheduleJob('0 9 * * 0', async () => {
    try {
      const result = await runNow(pool);
      console.log('[lifeos-scheduler] weekly relationship reminder tick:', result);
    } catch (err) {
      console.error('[lifeos-scheduler] weekly tick failed:', err.message);
    }
  });

  console.log('[lifeos-scheduler] relationship reminder scheduler started (weekly Sunday 09:00).');
  return job;
}

async function main() {
  const pool = createPool();
  if (!pool) {
    console.warn('[lifeos-scheduler] DATABASE_URL missing; exiting.');
    process.exit(0);
  }
  await ensureTables(pool);

  // When invoked directly, run once and then start the recurring scheduler.
  try {
    const result = await runNow(pool);
    console.log('[lifeos-scheduler] initial run:', result);
  } catch (err) {
    console.error('[lifeos-scheduler] initial run failed:', err.message);
  }

  // In CI / check runs, exit after a single tick. In production, set
  // LIFEOS_SCHEDULER_RUN_FOREVER=1 to keep the recurring weekly job alive.
  if (process.env.LIFEOS_SCHEDULER_RUN_FOREVER !== '1') {
    await pool.end();
    process.exit(0);
  }

  startScheduler(pool);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error('[lifeos-scheduler] fatal:', err);
    process.exit(1);
  });
}
