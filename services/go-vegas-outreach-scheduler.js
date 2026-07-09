/**
 * SYNOPSIS: Service module — Go Vegas Outreach Scheduler.
 */
import { createUsefulWorkGuard } from '../services/useful-work-guard.js';
import { createGoVegasOutreach } from '../services/go-vegas-outreach.js';

let schedulerHandle = null;
let bootTimerHandle = null;
let schedulerState = {
  status: 'idle',
  lastRunAt: null,
  lastResult: null,
  lastError: null,
  nextRunAt: null,
  runs: 0,
};

function getIntervalMs() {
  const raw = process.env.GO_VEGAS_SCHEDULER_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 21600000;
}

function getBootDelayMs() {
  return 120000;
}

function canSendNotification(notificationService) {
  return Boolean(
    notificationService &&
      (typeof notificationService.sendEmail === 'function' ||
        typeof notificationService.send === 'function' ||
        typeof notificationService.notify === 'function')
  );
}

function makeSendEmail(notificationService, logger) {
  if (notificationService && typeof notificationService.sendEmail === 'function') {
    return async (payload) => notificationService.sendEmail(payload);
  }

  if (notificationService && typeof notificationService.send === 'function') {
    return async (payload) => notificationService.send(payload);
  }

  if (notificationService && typeof notificationService.notify === 'function') {
    return async (payload) => notificationService.notify(payload);
  }

  throw new Error('No notification path available for Go Vegas outreach');
}

function countUsefulWorkRows(rows) {
  const first = rows?.[0];
  const value = first ? Number(first.cnt ?? first.count ?? first.total ?? 0) : 0;
  return Number.isFinite(value) ? value : 0;
}

async function hasUsefulWork(pool) {
  const sql = `
    WITH prospect_work AS (
      SELECT COUNT(*)::int AS cnt
      FROM go_vegas_prospects
      WHERE (
        status IN ('discovered', 'enriched')
        AND contact_email IS NOT NULL
        AND contact_email <> ''
      )
      OR (
        status IN ('invited', 'follow_up_due', 'follow_up_ready')
      )
    )
    SELECT cnt FROM prospect_work
  `;
  const result = await pool.query(sql);
  return countUsefulWorkRows(result.rows) > 0;
}

async function getGoVegasOutreachSchedulerStatus() {
  return {
    ...schedulerState,
    intervalMs: getIntervalMs(),
    bootDelayMs: getBootDelayMs(),
    active: Boolean(schedulerHandle || bootTimerHandle),
  };
}

async function runOneTick({ pool, notificationService, logger }) {
  schedulerState.status = 'running';
  schedulerState.lastError = null;
  schedulerState.lastRunAt = new Date().toISOString();

  const sendEmail = makeSendEmail(notificationService, logger);
  const outreach = createGoVegasOutreach({ pool, sendEmail, logger });

  await outreach.discoverBusinesses({ count: 5 });
  await outreach.enrichProspects({ limit: 10 });
  await outreach.inviteBatch({ limit: 5 });
  await outreach.runFollowUpCron({});

  schedulerState.status = 'idle';
  schedulerState.lastResult = 'completed';
  schedulerState.runs += 1;
  return { ok: true };
}

async function startGoVegasOutreachScheduler({ pool, notificationService, logger }) {
  if (!pool) {
    throw new Error('Go Vegas outreach scheduler requires pool');
  }

  if (!canSendNotification(notificationService)) {
    const msg = 'Go Vegas outreach scheduler disabled: no notification path available';
    logger?.warn?.(msg);
    schedulerState.status = 'disabled';
    schedulerState.lastError = msg;
    return { started: false, reason: msg };
  }

  if (schedulerHandle || bootTimerHandle) {
    return { started: true, alreadyRunning: true };
  }

  const guard = createUsefulWorkGuard?.({
    pool,
    logger,
    workCheck: async () => {
      const work = await hasUsefulWork(pool);
      if (work) return true;
      return process.env.GO_VEGAS_ALLOW_DISCOVER_IDLE === '1';
    },
  });

  const intervalMs = getIntervalMs();
  const bootDelayMs = getBootDelayMs();

  const tick = async () => {
    try {
      if (guard && typeof guard.shouldRun === 'function') {
        const decision = await guard.shouldRun();
        if (!decision?.run) {
          schedulerState.status = 'idle';
          schedulerState.lastResult = 'skipped_no_useful_work';
          schedulerState.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
          return;
        }
      } else {
        const work = await hasUsefulWork(pool);
        if (!work && process.env.GO_VEGAS_ALLOW_DISCOVER_IDLE !== '1') {
          schedulerState.status = 'idle';
          schedulerState.lastResult = 'skipped_no_useful_work';
          schedulerState.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
          return;
        }
      }

      await runOneTick({ pool, notificationService, logger });
      schedulerState.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    } catch (err) {
      schedulerState.status = 'error';
      schedulerState.lastError = err?.message || String(err);
      logger?.error?.({ err }, 'Go Vegas outreach scheduler tick failed');
    }
  };

  bootTimerHandle = setTimeout(async () => {
    bootTimerHandle = null;
    await tick();
    schedulerHandle = setInterval(tick, intervalMs);
    schedulerState.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
  }, bootDelayMs);

  schedulerState.status = 'scheduled';
  schedulerState.nextRunAt = new Date(Date.now() + bootDelayMs).toISOString();

  return { started: true, intervalMs, bootDelayMs };
}

export { startGoVegasOutreachScheduler, getGoVegasOutreachSchedulerStatus };