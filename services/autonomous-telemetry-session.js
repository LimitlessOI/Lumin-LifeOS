// services/autonomous-telemetry-session.js

import { runGovernedTelemetrySession } from './autonomous-telemetry-session';

async function runGovernedTelemetrySession(sessionId, cycleId) {
  const session = await getSession(sessionId);
  const cycleDefs = [
    {
      name: 'proof_verification',
      task_type: 'proof_verification.verify_proof',
      task_goal: 'verify proof',
      run: async () => {
        // existing implementation
      },
      emitsOwnTelemetry: false,
    },
    {
      name: 'prevention_hooks_read',
      task_type: 'prevention_hooks.read',
      task_goal: 'read prevention hooks',
      run: async () => {
        // existing implementation
      },
      emitsOwnTelemetry: false,
    },
    {
      name: 'memory_lessons_read',
      task_type: 'memory_lessons.read',
      task_goal: 'read memory lessons',
      run: async () => {
        // existing implementation
      },
      emitsOwnTelemetry: false,
    },
    {
      name: 'deploy_prevention_hook',
      task_type: 'prevention_hook.deploy_drift',
      task_goal: 'deploy prevention hook',
      run: async ({ sessionId: sId, cycleId: cId } = {}) => {
        const pool = await getPool();
        const options = { dryRun: false, triggeredBy: 'cycle', keep: true };
        const outcome = await runDeployDriftPreventionHook(pool, options, sId, cId);
        return outcome;
      },
      emitsOwnTelemetry: true,
    },
    {
      name: 'self_repair_dry_run',
      task_type: 'self_repair.dry_run',
      task_goal: 'self repair dry run',
      run: async ({ sessionId: sId, cycleId: cId } = {}) => {
        const pool = await getPool();
        const options = { pool, dryRun: true, repairId: '123', triggeredBy: 'cycle', keep: true };
        const outcome = await runSelfRepairExecutor(pool, options, sId, cId);
        return outcome;
      },
      emitsOwnTelemetry: true,
    },
  ];

  try {
    for (const def of cycleDefs) {
      const outcome = await def.run({ sessionId, cycleId });
      const tel = def.emitsOwnTelemetry ? { written: false, id: null } : await emitCycleTelemetry(outcome);
      cycles.push(tel);
    }
  } catch (error) {
    console.error(error);
  }

  // existing implementation
  return { cycles };
}

// existing implementation
```