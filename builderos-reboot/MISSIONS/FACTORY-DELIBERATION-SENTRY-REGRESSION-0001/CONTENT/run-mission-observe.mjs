#!/usr/bin/env node
/**
 * Conductor observation — objective FACTORY-DELIBERATION-SENTRY-REGRESSION-0001
 * Triggers recovery protocol when strategy forbidden. Minimal interference.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBpbIntakeGate } from '../../../../factory-staging/factory-core/bpb/intake-gate.js';
import { blueprintFreezeCheck } from '../../../../factory-staging/factory-core/sentry/blueprint-freeze-check.js';
import { runTier1Check } from '../../../scripts/tier1-telemetry-lib.mjs';
import { runLoopEscalation } from '../../../scripts/loop-escalation-lib.mjs';
import { runRecoveryProtocol } from '../../../scripts/recovery-protocol-lib.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const OID = 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
const DIR = path.join(ROOT, 'builderos-reboot/MISSIONS', OID);

const artifacts = {
  SENTRY_CHECK_RESULT: fs.existsSync(path.join(DIR, 'SENTRY_CHECK_RESULT.json')),
  BLUEPRINT: fs.existsSync(path.join(DIR, 'BLUEPRINT.json')),
  harness: fs.existsSync(path.join(ROOT, 'scripts/deliberation-sentry-regression-harness.mjs')),
  PROBE_pollution: fs.existsSync(path.join(DIR, 'PROBE.txt')),
};

const bp = JSON.parse(fs.readFileSync(path.join(DIR, 'BLUEPRINT.json'), 'utf8'));
const intake = runBpbIntakeGate(OID);
const freeze = blueprintFreezeCheck(bp);
const tier1 = runTier1Check(OID, { writeResult: true });
const loop = await runLoopEscalation(OID, { tier1, artifacts });

let recovery = null;
if (loop.recovery_protocol_active || loop.escalation_level === 'hard_stop' || loop.escalation_level === 'escalate') {
  recovery = await runRecoveryProtocol(OID);
  artifacts.SENTRY_CHECK_RESULT = fs.existsSync(path.join(DIR, 'SENTRY_CHECK_RESULT.json'));
}

const objectiveScore =
  recovery?.objective_score === 'PASS'
    ? 'PASS'
    : recovery?.resolution === 'UNSOLVED_HONEST'
      ? 'UNSOLVED'
      : recovery?.objective_score ?? (artifacts.SENTRY_CHECK_RESULT ? 'PARTIAL' : 'FAIL');

const observePass =
  objectiveScore === 'PASS' ||
  (recovery?.resolution === 'UNSOLVED_HONEST' && Boolean(recovery?.unsolved_written));

const row = {
  ts: new Date().toISOString(),
  objective_id: OID,
  intake_ok: intake.ok,
  freeze_ok: freeze.pass,
  tier1_verdict: tier1.verdict,
  loop_escalation_level: loop.escalation_level,
  recovery_ran: Boolean(recovery),
  recovery_resolution: recovery?.resolution ?? null,
  unsolved_written: recovery?.unsolved_written ?? null,
  sentry_verdict: recovery?.bp_audit?.receipt?.verdict ?? null,
  objective_score: objectiveScore,
  artifacts,
  system_terminal_stop: false,
};

fs.appendFileSync(path.join(DIR, 'OBSERVATION_LOG.jsonl'), `${JSON.stringify(row)}\n`);

console.log('=== OBSERVE', OID, '===');
console.log(JSON.stringify({ observe: row, recovery }, null, 2));

process.exit(observePass ? 0 : 1);
