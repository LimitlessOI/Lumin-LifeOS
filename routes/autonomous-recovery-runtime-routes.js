import { startAutonomousRecoveryCouncilScheduler } from '../services/autonomous-recovery-council.js';

let scheduler = null;

/**
 * Production boot hook for autonomous SENTRY recovery.
 * Auto-registration calls this in the founder_builder runtime Railway actually
 * runs. Idempotent so route reloads cannot create duplicate recovery loops.
 */
export function registerAutonomousRecoveryRuntimeRoutes(app, deps = {}) {
  const { logger = console, pool, requireKey } = deps;
  if (!scheduler) {
    scheduler = startAutonomousRecoveryCouncilScheduler({ logger, pool });
  }

  const guard = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();
  app.get('/api/v1/runtime/recovery/status', guard, (_req, res) => {
    res.json({
      ok: true,
      armed: Boolean(scheduler),
      terminal_stop_forbidden: true,
      founder_is_last_resort_never_router: true,
      interval_ms: Number(process.env.SENTRY_RECOVERY_INTERVAL_MS || 5 * 60 * 1000),
    });
  });

  logger?.info?.('[SENTRY-RECOVERY] runtime recovery hook mounted');
}

export default registerAutonomousRecoveryRuntimeRoutes;
