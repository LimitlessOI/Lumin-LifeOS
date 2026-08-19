/**
 * SYNOPSIS: Production boot hook for autonomous SENTRY recovery.
 */
import { startAutonomousRecoveryCouncilScheduler, CATASTROPHIC_STOP_STALE_MS } from '../services/autonomous-recovery-council.js';
import {
  startCostelloInfrastructureGuardianSupervisor,
  getCostelloInfrastructureGuardianSupervisorStatus,
} from '../services/costello-infrastructure-guardian-supervisor.js';

let scheduler = null;
let costelloGuardianSupervisor = null;

/**
 * Production boot hook for autonomous SENTRY recovery.
 * Auto-registration calls this in the founder_builder runtime Railway actually
 * runs. Idempotent so route reloads cannot create duplicate recovery loops.
 */
export function registerAutonomousRecoveryRuntimeRoutes(app, deps = {}) {
  const { logger = console, pool, requireKey } = deps;
  if (!scheduler) scheduler = startAutonomousRecoveryCouncilScheduler({ logger, pool });
  // Disarmed 2026-08-19 per founder decision: Costello (BuilderOS-B) never
  // produced a finished, verified result and its guardian's own Railway API
  // calls were adding risk surface to Abbott, the system that actually needs
  // to stay stable. Re-enable by setting COSTELLO_GUARDIAN_ENABLED=true.
  if (!costelloGuardianSupervisor && process.env.COSTELLO_GUARDIAN_ENABLED === 'true') {
    costelloGuardianSupervisor = startCostelloInfrastructureGuardianSupervisor({ logger }) || { already_armed: true };
  }

  // Public, read-only, non-secret observability so an independent watchdog can
  // verify Abbott is actually guarding Costello even when Costello itself is
  // dead and has no shared secrets configured. Railway/network provisioning is
  // never executed on this web process; it lives in the supervised child worker.
  app.get('/api/v1/runtime/costello-guardian/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, guardian: getCostelloInfrastructureGuardianSupervisorStatus() });
  });

  const guard = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();
  app.get('/api/v1/runtime/recovery/status', guard, (_req, res) => {
    res.json({
      ok: true,
      armed: Boolean(scheduler),
      terminal_stop_forbidden: true,
      catastrophic_stop_is_p0: true,
      immediate_founder_sms: true,
      immediate_founder_voice_call: true,
      recovery_continues_after_alert: true,
      interval_ms: Number(process.env.SENTRY_RECOVERY_INTERVAL_MS || 60 * 1000),
      catastrophic_stale_ms: CATASTROPHIC_STOP_STALE_MS,
      costello_external_guardian: getCostelloInfrastructureGuardianSupervisorStatus(),
    });
  });

  logger?.info?.('[SENTRY-RECOVERY] runtime recovery hook mounted with isolated Costello guardian supervisor');
}

export default registerAutonomousRecoveryRuntimeRoutes;