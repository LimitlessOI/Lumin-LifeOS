/**
 * SYNOPSIS: Useful-work-guarded Go Vegas outreach scheduler (discover→enrich→invite→follow-up under caps).
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { createUsefulWorkGuard } from './useful-work-guard.js';
import { createGoVegasOutreach } from './go-vegas-outreach.js';

let schedulerHandle = null;
let bootTimerHandle = null;
let schedulerState = {
  status: 'idle',
  lastRunAt: null,
  lastResult: null,
  lastError: null,
  nextRunAt: null,
  runs: 0,
  started: false,
};

function getIntervalMs() {
  const parsed = Number(process.env.GO_VEGAS_SCHEDULER_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 21_600_000;
}

function getBootDelayMs() {
  return 120_000;
}

function resolveSendEmail(notificationService) {
  if (!notificationService) return null;
  if (typeof notificationService.sendEmail === 'function') {
    return (payload) => notificationService.sendEmail(payload);
  }
  if (typeof notificationService.send === 'function') {
    return (payload) => notificationService.send(payload);
  }
  return null;
}

export function getGoVegasOutreachSchedulerStatus() {
  return {
    ...schedulerState,
    intervalMs: getIntervalMs(),
    bootDelayMs: getBootDelayMs(),
    active: Boolean(schedulerHandle || bootTimerHandle),
  };
}

export function startGoVegasOutreachScheduler({ pool, notificationService, logger } = {}) {
  if (!pool) {
    const msg = 'Go Vegas outreach scheduler requires pool';
    logger?.warn?.(msg);
    schedulerState.status = 'disabled';
    schedulerState.lastError = msg;
    return { started: false, reason: msg };
  }

  const sendEmail = resolveSendEmail(notificationService);
  const canSend = Boolean(sendEmail) || Boolean(process.env.COMMAND_CENTER_KEY);
  if (!canSend) {
    const msg = 'Go Vegas outreach scheduler disabled: no notification path and no COMMAND_CENTER_KEY';
    logger?.warn?.(msg);
    schedulerState.status = 'disabled';
    schedulerState.lastError = msg;
    return { started: false, reason: msg };
  }

  if (schedulerHandle || bootTimerHandle) {
    return { started: true, alreadyRunning: true };
  }

  const outreach = createGoVegasOutreach({
    pool,
    sendEmail: sendEmail || (async () => ({ success: false, error: 'sendEmail not configured' })),
    logger,
  });

  const workSql = `
    SELECT COUNT(*)::int AS count
    FROM go_vegas_prospects
    WHERE (
      status IN ('discovered', 'enriched')
      AND contact_email IS NOT NULL
      AND BTRIM(contact_email) <> ''
    )
    OR status IN ('invited', 'follow_up_due', 'follow_up_ready', 'awaiting_reply')
  `;

  const guardedTick = createUsefulWorkGuard({
    taskName: 'GO-VEGAS-OUTREACH-SCHEDULER',
    purpose: 'Discover/enrich/invite/follow-up Las Vegas businesses under daily send caps',
    allowInDirectedMode: true,
    logger,
    prerequisites: async () => {
      if (!pool) return { ok: false, reason: 'pool missing' };
      return { ok: true };
    },
    workCheck: async () => {
      try {
        const { rows } = await pool.query(workSql);
        const count = Number(rows?.[0]?.count || 0);
        if (count > 0) return { count, description: `${count} prospect(s) needing invite/follow-up` };
        if (process.env.GO_VEGAS_ALLOW_DISCOVER_IDLE === '1') {
          return { count: 1, description: 'idle discover allowed (GO_VEGAS_ALLOW_DISCOVER_IDLE=1)' };
        }
        return { count: 0, description: 'no invite/follow-up work' };
      } catch (err) {
        if (process.env.GO_VEGAS_ALLOW_DISCOVER_IDLE === '1') {
          return { count: 1, description: `table probe failed; idle discover allowed (${err.message})` };
        }
        return { count: 0, description: `work check failed: ${err.message}` };
      }
    },
    execute: async () => {
      schedulerState.status = 'running';
      schedulerState.lastError = null;
      schedulerState.lastRunAt = new Date().toISOString();
      const discover = await outreach.discoverBusinesses({ count: 5 });
      const enrich = await outreach.enrichProspects({ limit: 10 });
      const invite = await outreach.inviteBatch({ limit: 5 });
      const followUp = await outreach.runFollowUpCron({});
      schedulerState.status = 'idle';
      schedulerState.lastResult = {
        discover_ok: discover?.ok !== false,
        enrich_ok: enrich?.ok !== false,
        invite_ok: invite?.ok !== false,
        follow_up_ok: followUp?.ok !== false,
      };
      schedulerState.runs += 1;
      return { ok: true, discover, enrich, invite, followUp };
    },
  });

  const intervalMs = getIntervalMs();
  const bootDelayMs = getBootDelayMs();

  const tick = async () => {
    try {
      const outcome = await guardedTick();
      if (outcome?.skipped) {
        schedulerState.status = 'idle';
        schedulerState.lastResult = outcome;
      }
      schedulerState.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    } catch (err) {
      schedulerState.status = 'error';
      schedulerState.lastError = err?.message || String(err);
      logger?.warn?.({ err: schedulerState.lastError }, '[GO-VEGAS] scheduler tick failed');
    }
  };

  bootTimerHandle = setTimeout(() => {
    bootTimerHandle = null;
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[GO-VEGAS] boot tick failed'));
    schedulerHandle = setInterval(() => {
      tick().catch((err) => logger?.warn?.({ err: err.message }, '[GO-VEGAS] interval tick failed'));
    }, intervalMs);
  }, bootDelayMs);

  schedulerState.started = true;
  schedulerState.status = 'scheduled';
  schedulerState.nextRunAt = new Date(Date.now() + bootDelayMs).toISOString();
  logger?.info?.({ intervalMs, bootDelayMs }, '[GO-VEGAS] outreach scheduler started');
  return { started: true, intervalMs, bootDelayMs };
}
