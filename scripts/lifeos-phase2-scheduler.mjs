/**
 * SYNOPSIS: Phase2 daily ticks — future-self letter delivery + important-dates scan.
 * Useful-work gated: skip when pool missing or no deliverable work.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { checkAndDeliverLetters } from '../services/lifeos-future-self.js';
import { scanUpcomingDates } from '../services/lifeos-important-dates.js';

const DAY_MS = 24 * 60 * 60 * 1000;

async function notifyFn(db, userId, type, payload) {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS notifications (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id uuid,
         type text,
         payload jsonb,
         created_at timestamptz DEFAULT now()
       )`,
    );
  } catch {
    // table may already exist with a different shape — insert best-effort below
  }
  await db.query(
    'INSERT INTO notifications(user_id, type, payload) VALUES($1, $2, $3)',
    [userId, type, typeof payload === 'string' ? JSON.stringify({ text: payload }) : JSON.stringify(payload ?? {})],
  );
}

async function refreshEnergyCurveIfNeeded(db, baseUrl, userId) {
  const res = await db.query(
    'SELECT 1 FROM energy_logs WHERE user_id::text = $1 ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  if (!res.rowCount) return false;

  const endpoint = `${String(baseUrl).replace(/\/$/, '')}/api/v1/lifeos/energy/curve`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'x-user-id': String(userId) },
  });
  await response.text().catch(() => {});
  return response.ok;
}

export async function runPhase2Tick(db, deps = {}) {
  const logger = deps.logger || console;
  const baseUrl = deps.baseUrl || process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const skipInternalFetch = String(process.env.SKIP_INTERNAL_FETCH || '').toLowerCase() === 'true';

  try {
    await checkAndDeliverLetters(db, async (userId, content) => {
      await notifyFn(db, userId, 'future_self_letter', { content });
    });
  } catch (error) {
    logger.error?.({ err: error }, 'phase2 tick: future-self letters failed');
  }

  try {
    await scanUpcomingDates(db, async (userId, row) => {
      await notifyFn(db, userId, 'important_date', row);
    });
  } catch (error) {
    logger.error?.({ err: error }, 'phase2 tick: important-dates scan failed');
  }

  try {
    const activeUsers = await db.query(
      `SELECT id FROM lifeos_users WHERE COALESCE(active, true) = TRUE LIMIT 200`,
    );
    for (const row of activeUsers.rows || []) {
      if (skipInternalFetch) continue;
      try {
        await refreshEnergyCurveIfNeeded(db, baseUrl, row.id);
      } catch (error) {
        logger.warn?.({ err: error, userId: row.id }, 'phase2 tick: energy curve refresh skipped/failed');
      }
    }
  } catch (error) {
    logger.error?.({ err: error }, 'phase2 tick: energy scan failed');
  }

  return { ok: true };
}

export function startPhase2Scheduler({ pool, logger = console, intervalMs = DAY_MS, baseUrl } = {}) {
  if (!pool) {
    logger.warn?.('[phase2-scheduler] pool missing — not starting');
    return { stop: () => {} };
  }
  const tick = () =>
    runPhase2Tick(pool, { logger, baseUrl }).catch((err) => {
      logger.error?.(`[phase2-scheduler] tick failed: ${err.message}`);
    });
  tick();
  const handle = setInterval(tick, intervalMs);
  if (typeof handle.unref === 'function') handle.unref();
  logger.info?.('[phase2-scheduler] started');
  return {
    stop: () => clearInterval(handle),
  };
}

export default startPhase2Scheduler;
