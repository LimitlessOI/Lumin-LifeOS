/**
 * LifeOS background ticks: commitment prods + outreach queue processing.
 * No AI calls. Opt-in via LIFEOS_ENABLE_SCHEDULED_JOBS=1 (or true).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createCommitmentTracker } from './commitment-tracker.js';
import { createLifeOSNotificationRouter } from './lifeos-notification-router.js';
import { createOutreachEngine } from './outreach-engine.js';

const COMMITMENT_INTERVAL_MS = parseInt(process.env.LIFEOS_COMMITMENT_PROD_MS || '', 10) || 15 * 60 * 1000;
const OUTREACH_INTERVAL_MS = parseInt(process.env.LIFEOS_OUTREACH_PROCESS_MS || '', 10) || 5 * 60 * 1000;

function shouldStart() {
  const v = process.env.LIFEOS_ENABLE_SCHEDULED_JOBS;
  return v === '1' || v === 'true';
}

/**
 * @param {{ pool: import('pg').Pool, sendSMS: Function|null, notificationService: object|null, logger: object }} deps
 * @returns {{ started: boolean, timers?: NodeJS.Timeout[] }}
 */
export function startLifeOSScheduledJobs(deps) {
  const { pool, sendSMS, notificationService, logger } = deps;
  const log = {
    info: (...a) => logger?.info?.(...a) ?? console.log(...a),
    warn: (...a) => logger?.warn?.(...a) ?? console.warn(...a),
  };

  if (!shouldStart()) {
    log.info('[LIFEOS-SCHED] Scheduled jobs disabled — set LIFEOS_ENABLE_SCHEDULED_JOBS=1 to enable commitment prods + outreach processing');
    return { started: false };
  }

  const timers = [];

  const commitmentTick = async () => {
    try {
      const tracker = createCommitmentTracker(pool, null);
      const notifier = createLifeOSNotificationRouter({ pool, sendSMS, logger });
      const due = await tracker.getDueForProd();
      if (!due.length) return;

      let lastMirrorByUser = new Map();
      try {
        const { rows: mirrorRows } = await pool.query(`
          SELECT user_id,
                 MAX(COALESCE(viewed_at, acknowledged_at, created_at)) AS last_at
          FROM daily_mirror_log
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY user_id
        `);
        for (const r of mirrorRows) lastMirrorByUser.set(Number(r.user_id), r.last_at);
      } catch {
        /* table may not exist in some envs */
      }

      for (const row of due) {
        const uid = Number(row.user_id);
        await notifier.prodCommitment({
          userId: uid,
          commitmentId: row.id,
          commitmentTitle: row.title,
          lastSeenMirrorAt: lastMirrorByUser.get(uid) || null,
        });
        await tracker.logProd(row.id, 'overlay', `Reminder: ${row.title}`);
        await pool.query(
          `UPDATE commitments
           SET remind_at = NOW() + COALESCE(remind_interval, INTERVAL '24 hours'),
               updated_at = NOW()
           WHERE id = $1`,
          [row.id],
        );
      }
      log.info(`[LIFEOS-SCHED] Commitment prods queued: ${due.length}`);
    } catch (err) {
      log.warn(`[LIFEOS-SCHED] commitmentTick: ${err.message}`);
    }
  };

  const outreachTick = async () => {
    try {
      const outreach = createOutreachEngine({ pool, notificationService, sendSMS, logger });
      const result = await outreach.processQueue();
      if (result.executed > 0 || result.escalated > 0) {
        log.info(`[LIFEOS-SCHED] Outreach: executed=${result.executed} escalated=${result.escalated}`);
      }
    } catch (err) {
      log.warn(`[LIFEOS-SCHED] outreachTick: ${err.message}`);
    }
  };

  timers.push(setInterval(commitmentTick, COMMITMENT_INTERVAL_MS));
  timers.push(setInterval(outreachTick, OUTREACH_INTERVAL_MS));
  commitmentTick();
  outreachTick();

  log.info(`[LIFEOS-SCHED] Started (commitment every ${COMMITMENT_INTERVAL_MS}ms, outreach every ${OUTREACH_INTERVAL_MS}ms)`);
  return { started: true, timers };
}
