#!/usr/bin/env node
/**
 * SYNOPSIS: Standalone loop escalation check for a mission.
 * Standalone loop escalation check for a mission.
 * Usage: node loop-escalation-check.mjs FACTORY-DELIBERATION-SENTRY-REGRESSION-0001 [--enforce]
 * @ssot builderos-reboot/SNT_LOOP_ESCALATION_DOCTRINE.md
 */
import { runLoopEscalation } from './loop-escalation-lib.mjs';
import { runTier1Check } from './tier1-telemetry-lib.mjs';

const missionId = process.argv[2];
const enforce = process.argv.includes('--enforce');

if (!missionId) {
  console.error('Usage: loop-escalation-check.mjs <MISSION_ID> [--enforce]');
  process.exit(1);
}

const tier1 = runTier1Check(missionId, { writeResult: false });
const result = await runLoopEscalation(missionId, { tier1, artifacts: {} });

console.log(JSON.stringify(result, null, 2));

const blocked = result.same_agent_loop_blocked;
if (enforce && blocked) process.exit(1);
process.exit(0);
