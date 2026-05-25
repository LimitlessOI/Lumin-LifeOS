// services/self-repair-executor.js
import { emitSelfRepairTelemetry } from './telemetry';
import { finalizeArgs } from './finalize-args';

async function runSelfRepairExecutor({
  sessionId = null,
  cycleId = null,
  ...rest
}) {
  const { repairId, dryRun, triggeredBy, railwayDeploySha, startedAt, ...finalizeArgs } = rest;

  const finishArgs = {
    repairId,
    dryRun,
    triggeredBy,
    railwayDeploySha,
    startedAt,
    sessionId,
    cycleId,
  };

  try {
    await emitSelfRepairTelemetry({
      ...finalizeArgs,
      sessionId: finalizeArgs.sessionId ?? null,
      cycleId: finalizeArgs.cycleId ?? null,
    });
  } catch (error) {
    // existing error handling code remains unchanged
  }

  // existing code remains unchanged
}

export { runSelfRepairExecutor };