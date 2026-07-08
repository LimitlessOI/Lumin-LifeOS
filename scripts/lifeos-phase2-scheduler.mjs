/**
 * SYNOPSIS: Exports runPhase2Tick — scripts/lifeos-phase2-scheduler.mjs.
 */
import { checkAndDeliverLetters } from './s04.js';
import { scanUpcomingDates } from './s05.js';

async function notifyFn(db, userId, type, payload) {
  await db.query(
    'INSERT INTO notifications(user_id, type, payload) VALUES($1, $2, $3)',
    [userId, type, payload]
  );
}

async function refreshEnergyCurveIfNeeded(db, baseUrl, userId) {
  const res = await db.query(
    'SELECT 1 FROM energy_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  if (!res.rowCount) return false;

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v1/lifeos/energy/curve`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'x-user-id': String(userId)
    }
  });

  return response.ok;
}

export async function runPhase2Tick(db, deps = {}) {
  const logger = deps.logger || console;
  const baseUrl = deps.baseUrl || 'http://localhost:3000';
  const skipInternalFetch = String(process.env.SKIP_INTERNAL_FETCH || '').toLowerCase() === 'true';

  try {
    await checkAndDeliverLetters(db, async (userId, type, payload) => notifyFn(db, userId, type, payload));
  } catch (error) {
    logger.error?.({ err: error }, 'phase2 tick: future-self letters failed');
  }

  try {
    await scanUpcomingDates(db, async (userId, type, payload) => notifyFn(db, userId, type, payload));
  } catch (error) {
    logger.error?.({ err: error }, 'phase2 tick: important-dates scan failed');
  }

  try {
    const activeUsers = await db.query(
      'SELECT id FROM lifeos_users WHERE active = TRUE'
    );

    for (const row of activeUsers.rows) {
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
}