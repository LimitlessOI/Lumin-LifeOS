import { acquireGovernorHeavyLease, isGovernorAutonomyPaused } from "./governor.js";

export function createAutonomyScheduler(logger) {
  function scheduleAutonomyLoop(name, intervalMs, task, initialDelayMs = intervalMs) {
    try {
      if (isGovernorAutonomyPaused()) {
        logger.info(`⏸️ [AUTONOMY] ${name} disabled (PAUSE_AUTONOMY=1)`);
        return;
      }
    } catch (govErr) {
      logger.warn(`⚠️ [AUTONOMY] Governor check failed for ${name}:`, { error: govErr.message });
    }

    const run = async () => {
      try {
        if (isGovernorAutonomyPaused()) {
          setTimeout(run, intervalMs);
          return;
        }
      } catch (_) {
        // ignore governor errors in loop
      }
      const lease = acquireGovernorHeavyLease();
      if (!lease) {
        setTimeout(run, intervalMs);
        return;
      }
      try {
        await task();
      } catch (error) {
        logger.warn(`⚠️ [${name}]`, { error: error.message });
      } finally {
        lease.release();
        setTimeout(run, intervalMs);
      }
    };

    setTimeout(run, initialDelayMs);
  }

  function scheduleAutonomyOnce(name, delayMs, task) {
    if (isGovernorAutonomyPaused()) {
      return;
    }

    const run = async () => {
      if (isGovernorAutonomyPaused()) return;
      const lease = acquireGovernorHeavyLease();
      if (!lease) {
        setTimeout(run, delayMs);
        return;
      }
      try {
        await task();
      } catch (error) {
        logger.warn(`⚠️ [${name}]`, { error: error.message });
      } finally {
        lease.release();
      }
    };

    setTimeout(run, delayMs);
  }

  return { scheduleAutonomyLoop, scheduleAutonomyOnce };
}
