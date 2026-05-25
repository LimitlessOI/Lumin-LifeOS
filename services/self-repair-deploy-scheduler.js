import { runSelfRepairExecutor } from './self-repair-executor';
import { emitPreventionHookTelemetry } from './prevention-hook-telemetry';

async function runDeployRepairCheck(
  pool,
  { sessionId = null, cycleId = null, dryRun, triggeredBy, viaPreventionHook },
  repairId
) {
  if (dryRun) {
    await runSelfRepairExecutor(pool, { dryRun: true, repairId, triggeredBy, sessionId, cycleId });
  } else {
    await runSelfRepairExecutor(pool, { dryRun: false, repairId, triggeredBy, sessionId, cycleId });
  }

  if (viaPreventionHook) {
    emitPreventionHookTelemetry('skip', { outcome: 'skipped', triggeredBy, durationMs: 0, sessionId, cycleId });
  }

  if (dryRun) {
    emitPreventionHookTelemetry('dry_run', { outcome: 'dry_run', triggeredBy, durationMs: 0, sessionId, cycleId });
  }

  emitPreventionHookTelemetry('execute', { outcome: 'success', triggeredBy, durationMs: 0, sessionId, cycleId });
}

export { runDeployRepairCheck };