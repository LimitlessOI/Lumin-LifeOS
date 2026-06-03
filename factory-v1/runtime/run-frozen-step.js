import { executeStep } from '../builder/execute-step.js';
import { verifyStepResult } from '../sentry/verify-step-result.js';
import { recordStepOutcome } from '../historian/record-step-outcome.js';
import { recordStepMetrics } from '../tsos/record-step-metrics.js';

export async function runFrozenStep({ step, acceptanceTests }) {
  const startedAt = new Date().toISOString();
  const builder = await executeStep(step);
  const finishedAt = new Date().toISOString();

  const verifier = builder.status === 'BLOCKED_RETURN_TO_BPB'
    ? { status: 'SKIPPED_VERIFICATION', passed: false, failed_test_ids: [] }
    : await verifyStepResult(builder, acceptanceTests);

  const historian = await recordStepOutcome({
    mission_id: step.mission_id,
    blueprint_id: step.blueprint_id,
    step_id: step.step_id,
    builder_status: builder.status,
    verifier_status: verifier.status,
    timestamp: finishedAt
  });

  const tsos = await recordStepMetrics({
    mission_id: step.mission_id,
    blueprint_id: step.blueprint_id,
    step_id: step.step_id,
    status: verifier.status === 'FAILED_VERIFICATION' ? 'FAILED_VERIFICATION' : builder.status,
    started_at: startedAt,
    finished_at: finishedAt
  });

  return {
    status: verifier.status === 'FAILED_VERIFICATION' ? 'FAILED_VERIFICATION' : builder.status,
    builder,
    verifier,
    historian,
    tsos
  };
}
