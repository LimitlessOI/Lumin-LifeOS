#!/usr/bin/env node
/** Run autonomous recovery for an objective. Usage: run-recovery-protocol.mjs <OBJECTIVE_ID> */
import { runRecoveryProtocol } from './recovery-protocol-lib.mjs';

const objectiveId = process.argv[2] || 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
const result = await runRecoveryProtocol(objectiveId);
console.log(JSON.stringify(result, null, 2));
process.exit(result.objective_score === 'PASS' ? 0 : 1);
