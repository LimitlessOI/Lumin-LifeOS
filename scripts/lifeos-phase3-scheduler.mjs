#!/usr/bin/env node
/**
 * SYNOPSIS: Phase3 daily ticks — calendar-protection conflict scan for active rules.
 * Useful-work gated: skip when DATABASE_URL missing or zero active rules.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import pg from 'pg';
import { listRules, scanConflicts } from '../services/lifeos-calendar-protection.js';

const DAY_MS = 24 * 60 * 60 * 1000;

async function ensureNotificationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lifeos_phase3_notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid,
      event_id text,
      rule_id uuid,
      payload jsonb,
      created_at timestamptz DEFAULT now(),
      UNIQUE (user_id, event_id, rule_id)
    )
  `);
}

export async function runPhase3Tick({ pool, logger = console } = {}) {
  if (!pool) throw new Error('pool required');
  await ensureNotificationsTable(pool);

  const { rows: users } = await pool.query(
    `SELECT DISTINCT user_id FROM calendar_protection_rules WHERE active = true AND user_id IS NOT NULL`,
  );
  if (!users.length) {
    logger.info?.('[phase3-scheduler] skip — no active calendar_protection_rules');
    return { scanned_users: 0, conflicts_queued: 0 };
  }

  let conflictsQueued = 0;
  for (const { user_id: userId } of users) {
    const rules = await listRules(pool, userId);
    if (!rules.length) continue;

    let events = [];
    try {
      const ev = await pool.query(
        `SELECT id::text AS id, title, starts_at AS start, ends_at AS end
           FROM calendar_events
          WHERE user_id = $1
            AND starts_at < NOW() + INTERVAL '7 days'
            AND ends_at > NOW()
          ORDER BY starts_at ASC
          LIMIT 200`,
        [userId],
      );
      events = ev.rows;
    } catch {
      logger.warn?.(`[phase3-scheduler] calendar_events unavailable for user ${userId} — conflict scan skipped`);
      continue;
    }

    void rules;
    const conflicts = await scanConflicts(pool, userId, events).catch(() => []);
    const list = Array.isArray(conflicts) ? conflicts : conflicts?.conflicts || [];
    for (const c of list) {
      const eventId = String(c.event_id || c.event?.id || c.id || '');
      const ruleId = c.rule_id || c.rule?.id || null;
      if (!eventId || !ruleId) continue;
      const inserted = await pool.query(
        `INSERT INTO lifeos_phase3_notifications (user_id, event_id, rule_id, payload)
         VALUES ($1,$2,$3,$4::jsonb)
         ON CONFLICT (user_id, event_id, rule_id) DO NOTHING
         RETURNING id`,
        [userId, eventId, ruleId, JSON.stringify(c)],
      );
      if (inserted.rows.length) conflictsQueued += 1;
    }
  }

  logger.info?.(`[phase3-scheduler] tick complete users=${users.length} conflicts_queued=${conflictsQueued}`);
  return { scanned_users: users.length, conflicts_queued: conflictsQueued };
}

export function startPhase3Scheduler({ pool: injectedPool, intervalMs = DAY_MS, logger = console } = {}) {
  let ownsPool = false;
  let pool = injectedPool;
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.warn?.('[phase3-scheduler] DATABASE_URL missing — not starting');
      return { stop: () => {} };
    }
    pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    ownsPool = true;
  }

  const tick = () => runPhase3Tick({ pool, logger }).catch((err) => {
    logger.error?.(`[phase3-scheduler] tick failed: ${err.message}`);
  });

  tick();
  const handle = setInterval(tick, intervalMs);
  if (typeof handle.unref === 'function') handle.unref();
  logger.info?.('[phase3-scheduler] started');
  return {
    stop: async () => {
      clearInterval(handle);
      if (ownsPool) await pool.end().catch(() => {});
    },
  };
}

/** @deprecated use startPhase3Scheduler */
export const startScheduler = startPhase3Scheduler;

const isDirect = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
  || (process.argv[1] && import.meta.url.includes(process.argv[1].split('/').pop()));

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('lifeos-phase3-scheduler.mjs')) {
  startScheduler();
}

export default startScheduler;
