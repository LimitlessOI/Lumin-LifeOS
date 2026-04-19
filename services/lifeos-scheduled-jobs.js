/**
 * LifeOS background ticks: commitment prods + notification delivery + conversation ingest
 * + outreach queue processing + emotional early-warning + truth-style calibration +
 * weekly review.
 *
 * Opt-in via LIFEOS_ENABLE_SCHEDULED_JOBS=1 (or true).
 *
 * ZERO-WASTE AI RULE (CLAUDE.md):
 * Every AI-touching tick MUST go through `createUsefulWorkGuard()` — no AI
 * call fires unless (a) prerequisites exist and (b) real work is present.
 * See the individual tick declarations below; each one declares its own
 * prereq + workCheck so this file is the single enforcement point.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createCommitmentTracker } from './commitment-tracker.js';
import { createLifeOSNotificationRouter } from './lifeos-notification-router.js';
import { createOutreachEngine } from './outreach-engine.js';
import { createLifeOSCalendarService } from './lifeos-calendar.js';
import { createLifeOSEventStreamService } from './lifeos-event-stream.js';
import { createLifeOSFocusPrivacyService } from './lifeos-focus-privacy.js';
import { createEmotionalPatternEngine } from './emotional-pattern-engine.js';
import { createTruthDelivery } from './truth-delivery.js';
import { createLifeOSWeeklyReview } from './lifeos-weekly-review.js';
import { createUsefulWorkGuard, requireTableRows } from './useful-work-guard.js';

const COMMITMENT_INTERVAL_MS    = parseInt(process.env.LIFEOS_COMMITMENT_PROD_MS || '', 10) || 15 * 60 * 1000;
const NOTIFICATION_INTERVAL_MS  = parseInt(process.env.LIFEOS_NOTIFICATION_PROCESS_MS || '', 10) || 60 * 1000;
const EVENT_INGEST_INTERVAL_MS  = parseInt(process.env.LIFEOS_EVENT_INGEST_MS || '', 10) || 10 * 60 * 1000;
const OUTREACH_INTERVAL_MS      = parseInt(process.env.LIFEOS_OUTREACH_PROCESS_MS || '', 10) || 5 * 60 * 1000;
const EARLY_WARNING_INTERVAL_MS = parseInt(process.env.LIFEOS_EARLY_WARNING_MS || '', 10) || 60 * 60 * 1000;    // hourly
const CALIBRATION_INTERVAL_MS   = parseInt(process.env.LIFEOS_CALIBRATION_MS || '', 10) || 24 * 60 * 60 * 1000; // daily
const WEEKLY_REVIEW_CHECK_MS    = parseInt(process.env.LIFEOS_WEEKLY_REVIEW_MS || '', 10) || 60 * 60 * 1000;    // check hourly, only fires Sunday evening

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

  // ── Event ingest tick (guarded) ─────────────────────────────────────────
  // Pulls new conversation messages and classifies them into LifeOS events.
  // WORK CHECK: only runs when there is at least one unclassified conversation
  // message in the last 48h for an active LifeOS user. This prevents the AI
  // classifier from firing on empty queues every 10 minutes.
  const eventIngestTick = createUsefulWorkGuard({
    taskName: 'lifeos_event_ingest',
    purpose:  'Classify new conversation messages into LifeOS events (commitments, calendar, notes)',
    prerequisites: async () => {
      if (!callAI) return { ok: false, reason: 'callAI not configured' };
      return { ok: true };
    },
    workCheck: requireTableRows(
      pool,
      // conversation_messages exists in the LifeOS schema; we count messages
      // from the last 48h that have not been ingested into the event stream.
      // If either table is absent (older env) we still return 0 which is safe.
      `SELECT COALESCE((
         SELECT COUNT(*)::int
         FROM conversation_messages m
         LEFT JOIN lifeos_events e
           ON e.source_ref = ('conversation_message:' || m.id)
         WHERE m.created_at > NOW() - INTERVAL '48 hours'
           AND e.id IS NULL
       ), 0) AS count`,
      [],
      'unclassified conversation messages'
    ),
    execute: async () => {
      const tracker      = createCommitmentTracker(pool, callAI);
      const calendar     = createLifeOSCalendarService(pool);
      const focusPrivacy = createLifeOSFocusPrivacyService(pool);
      const events       = createLifeOSEventStreamService({
        pool, callAI, commitments: tracker, calendar, focusPrivacy, logger,
      });
      const { rows: users } = await pool.query(
        `SELECT id FROM lifeos_users WHERE active = TRUE ORDER BY id ASC LIMIT 25`
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
      return { ingested: total };
    },
    logger,
  });

  // ── Early warning tick (guarded) — emotional pattern scanner ──────────────
  // Runs earlyWarning() against recent joy_checkins + daily_emotional_checkins
  // text. WORK CHECK: at least one active user has (a) at least one emotional
  // pattern on file AND (b) a check-in in the last 48h with non-empty text.
  // Without both conditions the pattern engine has nothing to match against,
  // so firing AI would be pure waste.
  const earlyWarningTick = createUsefulWorkGuard({
    taskName: 'lifeos_early_warning',
    purpose:  'Scan recent emotional signal for known patterns and queue a gentle overlay warning before depletion completes',
    prerequisites: async () => {
      if (!callAI) return { ok: false, reason: 'callAI not configured' };
      return { ok: true };
    },
    workCheck: requireTableRows(
      pool,
      // Count active users who have ≥1 pattern AND ≥1 recent signal.
      // `daily_emotional_checkins` is optional (older envs) — wrap with COALESCE.
      `
      SELECT COUNT(*)::int AS count
      FROM lifeos_users u
      WHERE u.active = TRUE
        AND EXISTS (
          SELECT 1 FROM emotional_patterns p WHERE p.user_id = u.id
        )
        AND (
          EXISTS (
            SELECT 1 FROM joy_checkins jc
            WHERE jc.user_id = u.id
              AND jc.created_at > NOW() - INTERVAL '48 hours'
              AND COALESCE(jc.notes, '') <> ''
          )
          OR EXISTS (
            SELECT 1 FROM daily_emotional_checkins d
            WHERE d.user_id = u.id
              AND d.created_at > NOW() - INTERVAL '48 hours'
          )
        )
      `,
      [],
      'users with patterns + recent emotional signal'
    ),
    execute: async () => {
      const { rows: users } = await pool.query(
        `SELECT id FROM lifeos_users WHERE active = TRUE ORDER BY id ASC LIMIT 25`
      );
      const patternEngine = createEmotionalPatternEngine({ pool, callAI, logger });
      const notifier      = createLifeOSNotificationRouter({ pool, sendSMS, logger });

      let warned = 0;
      for (const user of users) {
        try {
          const signalParts = [];
          const { rows: joy } = await pool.query(
            `SELECT notes FROM joy_checkins
             WHERE user_id = $1 AND created_at > NOW() - INTERVAL '48 hours'
             ORDER BY created_at DESC LIMIT 10`,
            [user.id]
          );
          for (const r of joy) { if (r.notes) signalParts.push(r.notes); }

          // Include daily emotional check-ins if the table exists
          try {
            const { rows: daily } = await pool.query(
              `SELECT weather, note, somatic_note, intensity, valence, depletion_tags
               FROM daily_emotional_checkins
               WHERE user_id = $1 AND created_at > NOW() - INTERVAL '48 hours'
               ORDER BY created_at DESC LIMIT 5`,
              [user.id]
            );
            for (const r of daily) {
              const parts = [r.weather, r.note, r.somatic_note, (r.depletion_tags || []).join(' ')]
                .filter(Boolean).join(' ');
              if (parts) signalParts.push(parts);
            }
          } catch { /* table may not exist yet in some envs */ }

          const signal = signalParts.join(' ').trim();
          if (!signal) continue;

          const { warning, patterns } = await patternEngine.earlyWarning(user.id, signal);
          if (!warning) continue;

          const patternLabels = patterns
            .map(p => p.pattern_type || p.pattern_name || 'depletion pattern')
            .join(', ');
          await notifier.queue({
            userId:   user.id,
            type:     'early_warning',
            title:    'Emotional pattern detected',
            body:     `The system noticed signals that have historically preceded ${patternLabels}. This is early — you have time to respond.`,
            priority: 2,
            channel:  'overlay',
          });
          warned++;
          log.info({ userId: user.id, patterns: patternLabels }, '[LIFEOS-SCHED] Early warning queued');
        } catch (userErr) {
          log.warn({ userId: user.id, err: userErr.message }, '[LIFEOS-SCHED] earlyWarning user error');
        }
      }
      return { warned };
    },
    logger,
  });

  // ── Truth delivery calibration tick (guarded) ─────────────────────────────
  // Pure SQL aggregation (no AI call), but we still guard it so it doesn't run
  // against empty tables on fresh databases. WORK CHECK: at least one user has
  // ≥5 truth_delivery_log rows recorded across ≥2 distinct styles in the last
  // 90d. (Historically this pointed at a non-existent `truth_deliveries` table,
  // which silently returned zero on every DB — drift fix 2026-04-18.)
  const calibrationTick = createUsefulWorkGuard({
    taskName: 'lifeos_truth_calibration',
    purpose:  'Calibrate each user\'s preferred truth-delivery style based on observed acknowledgment rates',
    prerequisites: async () => ({ ok: true }), // no external deps; DB only
    workCheck: requireTableRows(
      pool,
      // Count users who have ≥5 deliveries in ≥2 distinct styles over the last 90d.
      `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT user_id
        FROM (
          SELECT user_id, style_used
          FROM truth_delivery_log
          WHERE created_at > NOW() - INTERVAL '90 days'
          GROUP BY user_id, style_used
          HAVING COUNT(*) >= 5
        ) per_user_style
        GROUP BY user_id
        HAVING COUNT(DISTINCT style_used) >= 2
      ) calibrable_users
      `,
      [],
      'users with enough truth-delivery data to calibrate'
    ),
    execute: async () => {
      const truthSvc = createTruthDelivery({ pool, callAI: null });
      const { rows: users } = await pool.query(
        `SELECT id, truth_style FROM lifeos_users WHERE active = TRUE ORDER BY id ASC LIMIT 50`
      );
      let updated = 0;
      for (const user of users) {
        try {
          const effectiveness = await truthSvc.getStyleEffectiveness(user.id);
          const qualified = (effectiveness || []).filter(e => parseInt(e.deliveries, 10) >= 5);
          if (qualified.length < 2) continue;
          const best = qualified.sort((a, b) => parseFloat(b.ack_rate) - parseFloat(a.ack_rate))[0];
          if (best.style_used !== user.truth_style) {
            await pool.query(
              `UPDATE lifeos_users SET truth_style = $1 WHERE id = $2`,
              [best.style_used, user.id]
            );
            log.info(
              { userId: user.id, from: user.truth_style, to: best.style_used, ack_rate: best.ack_rate },
              '[LIFEOS-SCHED] truth_style calibrated from delivery data'
            );
            updated++;
          }
        } catch { /* non-fatal per user */ }
      }
      if (updated > 0) log.info({ updated }, '[LIFEOS-SCHED] Calibration tick: truth styles updated');
      return { updated };
    },
    logger,
  });

  // ── Weekly review tick (guarded) ────────────────────────────────────────
  // Runs hourly; generates a personal weekly letter for each active user, but
  // only on Sunday evenings (local time) and only when no review for the
  // current week already exists. WORK CHECK combines both: the current time
  // must be Sunday >=18:00 AND at least one active user has no weekly_review
  // row for the current ISO week.
  const weeklyReviewTick = createUsefulWorkGuard({
    taskName: 'lifeos_weekly_review',
    purpose:  'Generate Sunday-evening personal weekly review letters',
    prerequisites: async () => {
      if (!callAI) return { ok: false, reason: 'callAI not configured' };
      const now = new Date();
      if (now.getDay() !== 0 || now.getHours() < 18) {
        return { ok: false, reason: `outside Sunday 18:00+ window (now: ${now.toString()})` };
      }
      return { ok: true };
    },
    workCheck: requireTableRows(
      pool,
      // Count users who are active but have no weekly_review for the current ISO week
      `
      SELECT COUNT(*)::int AS count
      FROM lifeos_users u
      WHERE u.active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM weekly_reviews wr
          WHERE wr.user_id = u.id
            AND DATE_TRUNC('week', wr.week_start::date) = DATE_TRUNC('week', CURRENT_DATE)
        )
      `,
      [],
      'active users without a review for this week'
    ),
    execute: async () => {
      const svc = createLifeOSWeeklyReview({ pool, callAI, logger });
      const { rows: users } = await pool.query(
        `SELECT id FROM lifeos_users WHERE active = TRUE ORDER BY id ASC LIMIT 50`
      );
      let generated = 0;
      for (const user of users) {
        try {
          await svc.generateReview(user.id);
          generated++;
        } catch { /* non-fatal per user */ }
      }
      if (generated > 0) log.info({ generated }, '[LIFEOS-SCHED] Weekly reviews generated');
      return { generated };
    },
    logger,
  });

  timers.push(setInterval(commitmentTick, COMMITMENT_INTERVAL_MS));
  timers.push(setInterval(notificationTick, NOTIFICATION_INTERVAL_MS));
  timers.push(setInterval(eventIngestTick, EVENT_INGEST_INTERVAL_MS));
  timers.push(setInterval(outreachTick, OUTREACH_INTERVAL_MS));
  timers.push(setInterval(earlyWarningTick, EARLY_WARNING_INTERVAL_MS));
  timers.push(setInterval(calibrationTick, CALIBRATION_INTERVAL_MS));
  timers.push(setInterval(weeklyReviewTick, WEEKLY_REVIEW_CHECK_MS));
  commitmentTick();
  notificationTick();
  eventIngestTick();
  outreachTick();
  // Early warning runs first time after 10 minutes to let the system warm up
  setTimeout(earlyWarningTick, 10 * 60 * 1000);

  log.info(`[LIFEOS-SCHED] Started (commitment every ${COMMITMENT_INTERVAL_MS}ms, notification every ${NOTIFICATION_INTERVAL_MS}ms, event ingest every ${EVENT_INGEST_INTERVAL_MS}ms, outreach every ${OUTREACH_INTERVAL_MS}ms, early-warning every ${EARLY_WARNING_INTERVAL_MS}ms, weekly-review check every ${WEEKLY_REVIEW_CHECK_MS}ms)`);
  return { started: true, timers };
}
