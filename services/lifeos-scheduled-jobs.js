/**
 * LifeOS background ticks: commitment prods + notification delivery + conversation ingest
 * + outreach queue processing. Opt-in via LIFEOS_ENABLE_SCHEDULED_JOBS=1 (or true).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createCommitmentTracker } from './commitment-tracker.js';
import { createLifeOSNotificationRouter } from './lifeos-notification-router.js';
import { createOutreachEngine } from './outreach-engine.js';
import { createLifeOSCalendarService } from './lifeos-calendar.js';
import { createLifeOSEventStreamService } from './lifeos-event-stream.js';
import { createLifeOSFocusPrivacyService } from './lifeos-focus-privacy.js';

const COMMITMENT_INTERVAL_MS = parseInt(process.env.LIFEOS_COMMITMENT_PROD_MS || '', 10) || 15 * 60 * 1000;
const NOTIFICATION_INTERVAL_MS = parseInt(process.env.LIFEOS_NOTIFICATION_PROCESS_MS || '', 10) || 60 * 1000;
const EVENT_INGEST_INTERVAL_MS = parseInt(process.env.LIFEOS_EVENT_INGEST_MS || '', 10) || 10 * 60 * 1000;
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
  const { pool, sendSMS, notificationService, logger, callAI = null } = deps;
  const log = {
    info: (...a) => logger?.info?.(...a) ?? console.log(...a),
    warn: (...a) => logger?.warn?.(...a) ?? console.warn(...a),
  };

  if (!shouldStart()) {
    log.info('[LIFEOS-SCHED] Scheduled jobs disabled — set LIFEOS_ENABLE_SCHEDULED_JOBS=1 to enable commitment prods + notification delivery + event ingest + outreach processing');
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

  const notificationTick = async () => {
    try {
      const notifier = createLifeOSNotificationRouter({ pool, sendSMS, logger });
      const { rows } = await pool.query(
        `SELECT id
           FROM lifeos_notification_queue
          WHERE status = 'pending'
            AND scheduled_at <= NOW()
          ORDER BY priority ASC, scheduled_at ASC
          LIMIT 25`
      );
      for (const row of rows) {
        await notifier.deliver(row.id);
      }
      if (rows.length) {
        log.info(`[LIFEOS-SCHED] Notifications delivered: ${rows.length}`);
      }
    } catch (err) {
      log.warn(`[LIFEOS-SCHED] notificationTick: ${err.message}`);
    }
  };

  const eventIngestTick = async () => {
    if (!callAI) return;
    try {
      const tracker = createCommitmentTracker(pool, callAI);
      const calendar = createLifeOSCalendarService(pool);
      const focusPrivacy = createLifeOSFocusPrivacyService(pool);
      const events = createLifeOSEventStreamService({ pool, callAI, commitments: tracker, calendar, focusPrivacy, logger });
      const { rows: users } = await pool.query(
        `SELECT id FROM lifeos_users ORDER BY id ASC LIMIT 25`
      );
      let total = 0;
      for (const user of users) {
        const result = await events.ingestConversationMessages({
          userId: user.id,
          limit: 50,
          autoApply: false,
        });
        total += Number(result.ingested_count || 0);
      }
      if (total > 0) {
        log.info(`[LIFEOS-SCHED] Event stream ingested conversation messages: ${total}`);
      }
    } catch (err) {
      log.warn(`[LIFEOS-SCHED] eventIngestTick: ${err.message}`);
    }
  };

  timers.push(setInterval(commitmentTick, COMMITMENT_INTERVAL_MS));
  timers.push(setInterval(notificationTick, NOTIFICATION_INTERVAL_MS));
  timers.push(setInterval(eventIngestTick, EVENT_INGEST_INTERVAL_MS));
  timers.push(setInterval(outreachTick, OUTREACH_INTERVAL_MS));
  commitmentTick();
  notificationTick();
  eventIngestTick();
  outreachTick();

  log.info(`[LIFEOS-SCHED] Started (commitment every ${COMMITMENT_INTERVAL_MS}ms, notification every ${NOTIFICATION_INTERVAL_MS}ms, event ingest every ${EVENT_INGEST_INTERVAL_MS}ms, outreach every ${OUTREACH_INTERVAL_MS}ms)`);
  return { started: true, timers };
}
