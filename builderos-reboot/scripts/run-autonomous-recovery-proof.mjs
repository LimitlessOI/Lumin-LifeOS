#!/usr/bin/env node
/**
 * AUTONOMOUS-RECOVERY-0001 proof runner — regression objective must complete or UNSOLVED honestly.
 * @ssot builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json
 */
import { runLoopEscalation } from './loop-escalation-lib.mjs';
import { runRecoveryProtocol } from './recovery-protocol-lib.mjs';
import { runTier1Check } from './tier1-telemetry-lib.mjs';

const objectiveId = process.argv[2] || 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';

const tier1 = runTier1Check(objectiveId, { writeResult: true });
const loop = await runLoopEscalation(objectiveId, { tier1, artifacts: {} });
const recovery = await runRecoveryProtocol(objectiveId);

const proof = {
  schema: 'autonomous_recovery_proof_v1',
  generated_at: new Date().toISOString(),
  recovery_mission: 'AUTONOMOUS-RECOVERY-0001',
  objective_id: objectiveId,
  loop_escalation_level: loop.escalation_level,
  recovery_resolution: recovery.resolution,
  objective_score: recovery.objective_score,
  system_terminal_stop: false,
  pass:
    recovery.objective_score === 'PASS' ||
    (recovery.resolution === 'UNSOLVED_HONEST' && Boolean(recovery.unsolved_written)),
};

console.log(JSON.stringify({ proof, loop, recovery }, null, 2));
process.exit(proof.pass ? 0 : 1);
