/**
 * SYNOPSIS: Service module — Go Vegas Outreach Scheduler.
 */
export { startGoVegasOutreachScheduler, getGoVegasOutreachSchedulerStatus };

import { createUsefulWorkGuard } from '../services/useful-work-guard.js';
import { createGoVegasOutreach } from '../services/go-vegas-outreach.js';

const DEFAULT_INTERVAL_MS = 21600000;
const BOOT_DELAY_MS = 120000;

let schedulerState = {
  started: false,
  running: false,
  lastRunAt: null,
  lastRunStatus: 'idle',
  lastError: null,
  nextRunAt: null,
  intervalMs: DEFAULT_INTERVAL_MS,
  timer: null,
  bootTimer: null,
};

function hasSendCapability(notificationService) {
  return Boolean(
    notificationService &&
      (typeof notificationService.sendEmail === 'function' ||
        typeof notificationService.send === 'function' ||
        typeof notificationService.notify === 'function')
  );
}

function createSendEmail(notificationService, logger) {
  if (notificationService && typeof notificationService.sendEmail === 'function') {
    return async (payload) => notificationService.sendEmail(payload);
  }
  if (notificationService && typeof notificationService.send === 'function') {
    return async (payload) => notificationService.send(payload);
  }
  if (notificationService && typeof notificationService.notify === 'function') {
    return async (payload) => notificationService.notify(payload);
  }
  return async () => {
    logger?.warn?.('go-vegas outreach scheduler started without a send-capable notification path');
    return { skipped: true };
  };
}

async function countUsefulWork(pool) {
  const sql = `
    SELECT
      COALESCE((
        SELECT COUNT(*)
        FROM lifeos_outreach_tasks
        WHERE recipient_email IS NOT NULL
          AND recipient_email <> ''
          AND (
            (response IS NULL AND outcome IS NULL)
            OR outcome IN ('discovered', 'enriched', 'contacted', 'follow_up_due')
          )
      ), 0)::int AS follow_up_or_pending_count
  `;
  const result = await pool.query(sql);
  return Number(result.rows?.[0]?.follow_up_or_pending_count ?? 0);
}

async function canDiscoverIdle(pool) {
  const sql = `
    SELECT EXISTS (
      SELECT 1
      FROM lifeos_outreach_tasks
      WHERE recipient_email IS NULL
         OR recipient_email = ''
         OR outcome IN ('new', 'discovered')
    ) AS can_discover
  `;
  const result = await pool.query(sql);
  return Boolean(result.rows?.[0]?.can_discover);
}

function scheduleNextRun(intervalMs) {
  if (schedulerState.timer) clearTimeout(schedulerState.timer);
  schedulerState.nextRunAt = Date.now() + intervalMs;
  schedulerState.timer = setTimeout(() => {
    void runSchedulerTick().catch(() => {});
  }, intervalMs);
}

async function runSchedulerTick() {
  const { pool, notificationService, logger, intervalMs } = schedulerState.context || {};
  if (!pool) return;
  if (schedulerState.running) return;

  schedulerState.running = true;
  schedulerState.lastRunAt = new Date().toISOString();
  schedulerState.lastRunStatus = 'running';
  schedulerState.lastError = null;

  try {
    const usefulWorkGuard = createUsefulWorkGuard({
      pool,
      logger,
      tableName: 'lifeos_outreach_tasks',
    });

    const workCount = await countUsefulWork(pool);
    const allowDiscoverIdle = String(process.env.GO_VEGAS_ALLOW_DISCOVER_IDLE || '') === '1';
    const canDiscover = allowDiscoverIdle ? await canDiscoverIdle(pool) : false;

    if (workCount <= 0 && !allowDiscoverIdle) {
      schedulerState.lastRunStatus = 'skipped_no_work';
      return;
    }

    if (workCount <= 0 && allowDiscoverIdle && !canDiscover) {
      schedulerState.lastRunStatus = 'skipped_no_work';
      return;
    }

    if (typeof usefulWorkGuard === 'function') {
      const guarded = await usefulWorkGuard({
        purpose: 'go-vegas-outreach',
        workCount: workCount > 0 ? workCount : canDiscover ? 1 : 0,
      });
      if (guarded === false) {
        schedulerState.lastRunStatus = 'skipped_guarded';
        return;
      }
    }

    const sendEmail = createSendEmail(notificationService, logger);
    const outreach = createGoVegasOutreach({ pool, sendEmail, logger });

    if (workCount > 0 || allowDiscoverIdle) {
      await outreach.discoverBusinesses({ count: 5 });
      await outreach.enrichProspects({ limit: 10 });
      await outreach.inviteBatch({ limit: 5 });
      await outreach.runFollowUpCron({});
    }

    schedulerState.lastRunStatus = 'completed';
  } catch (error) {
    schedulerState.lastRunStatus = 'error';
    schedulerState.lastError = error instanceof Error ? error.message : String(error);
    logger?.error?.({ err: error }, 'go-vegas outreach scheduler tick failed');
  } finally {
    schedulerState.running = false;
    scheduleNextRun(intervalMs);
  }
}

function startGoVegasOutreachScheduler({ pool, notificationService, logger }) {
  if (!pool) {
    logger?.warn?.('go-vegas outreach scheduler not started: missing pool');
    return getGoVegasOutreachSchedulerStatus();
  }

  if (!hasSendCapability(notificationService)) {
    logger?.warn?.('go-vegas outreach scheduler not started: no send-capable notification path');
    return getGoVegasOutreachSchedulerStatus();
  }

  const intervalMs = Number(process.env.GO_VEGAS_SCHEDULER_MS || DEFAULT_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  schedulerState.context = { pool, notificationService, logger, intervalMs };
  schedulerState.intervalMs = intervalMs;
  schedulerState.started = true;

  if (!schedulerState.bootTimer) {
    schedulerState.bootTimer = setTimeout(() => {
      void runSchedulerTick().catch(() => {});
    }, BOOT_DELAY_MS);
  }

  if (!schedulerState.timer && !schedulerState.running) {
    scheduleNextRun(intervalMs);
  }

  return getGoVegasOutreachSchedulerStatus();
}

function getGoVegasOutreachSchedulerStatus() {
  return {
    started: schedulerState.started,
    running: schedulerState.running,
    lastRunAt: schedulerState.lastRunAt,
    lastRunStatus: schedulerState.lastRunStatus,
    lastError: schedulerState.lastError,
    nextRunAt: schedulerState.nextRunAt,
    intervalMs: schedulerState.intervalMs,
  };
}