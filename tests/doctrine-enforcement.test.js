/**
 * SYNOPSIS: js — tests/doctrine-enforcement.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  measurementEnvelope,
  validateReceiptMeasurements,
} from '../factory-staging/factory-core/arc/foundation/simulation-measurements.js';
import { evaluateResultTruth } from '../factory-staging/factory-core/arc/foundation/doctrine-enforcement.js';
import { isStubSntReceipt } from '../factory-staging/factory-core/arc/point-b-gate.js';

const CAP = path.join(process.cwd(), 'builderos-reboot/MISSIONS/PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001');

describe('doctrine enforcement', () => {
  it('measurement envelope requires falsifiability', () => {
    assert.throws(() => measurementEnvelope({ seat: 'SNT', metric_id: 'x', predicted: 'y' }));
    const m = measurementEnvelope({
      seat: 'SNT',
      metric_id: 'x',
      predicted: 'y',
      how_we_know_if_wrong: 'acceptance FAIL',
    });
    assert.ok(m.how_we_know_if_wrong);
  });

  it('SNT blocking pass without evidence is stub', () => {
    assert.equal(
      isStubSntReceipt({
        attacks: [{ severity: 'blocking', pass: true, evidence_if_wrong: null }],
        verdict: 'builder_clearance_yes',
      }),
      true,
    );
  });

  it('department receipt without measurements fails validation on BP pattern', () => {
    const bad = { pass: true, attacks: [{ claim: 'x', pass: true, severity: 'blocking', evidence_if_wrong: 'ok' }] };
    const v = validateReceiptMeasurements(bad, 'SNT');
    assert.equal(v.pass, false);
  });

  it('capture v2 TECHNICAL_PASS has result truth when acceptance receipt PASS', () => {
    if (!fs.existsSync(path.join(CAP, 'OBJECTIVE_VERDICT.json'))) return;
    const blueprint = JSON.parse(fs.readFileSync(path.join(CAP, 'BLUEPRINT.json'), 'utf8'));
    const objective = JSON.parse(fs.readFileSync(path.join(CAP, 'OBJECTIVE_VERDICT.json'), 'utf8'));
    if (objective.verdict !== 'TECHNICAL_PASS') return;
    const truth = evaluateResultTruth(CAP, blueprint);
    assert.equal(truth.pass, true);
  });
});
