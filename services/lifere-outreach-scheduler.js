/**
 * SYNOPSIS: LifeRE outreach scheduler — processes approved outreach tasks on interval.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createUsefulWorkGuard, requireTableRows } from './useful-work-guard.js';
import { createLifeREOutreachBridge } from './lifere-outreach-bridge.js';

export function startLifeREOutreachScheduler({
  pool = null,
  notificationService = null,
  sendSMS = null,
  logger = console,
  intervalMs = 15 * 60 * 1000,
} = {}) {
  if (!pool) {
    logger.info?.('[LIFERE-OUTREACH] Scheduler skip — no pool');
    return { started: false };
  }

  const bridge = createLifeREOutreachBridge({ pool, notificationService, sendSMS, logger });

  const workCheck = requireTableRows(
    pool,
    `SELECT COUNT(*) FROM lifeos_outreach_tasks WHERE status='pending' AND approved=true`,
    [],
    'approved outreach tasks',
  );

  const guarded = createUsefulWorkGuard({
    taskName: 'LifeRE Outreach Queue',
    purpose: 'Execute approved LifeRE outreach tasks from lifeos_outreach_tasks',
    prerequisites: async () => ({ ok: true }),
    workCheck,
    execute: async () => bridge.processQueue({ userId: 'adam' }),
    logger,
  });

  const timer = setInterval(guarded, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();

  logger.info?.('[LIFERE-OUTREACH] Scheduler started (15m interval, useful-work guarded)');
  return { started: true, intervalMs };
}
