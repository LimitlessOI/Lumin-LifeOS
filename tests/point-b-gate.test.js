/**
 * SYNOPSIS: js — tests/point-b-gate.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluatePointBGate,
  evaluateCorridorEntered,
  isStubSntReceipt,
  isEmptyBuilderSim,
} from '../factory-staging/factory-core/arc/point-b-gate.js';
import { evaluatePreHandoffIntentGate } from '../factory-staging/factory-core/arc/pre-handoff-intent-gate.js';
import {
  runDepartmentSimulations,
  validateDepartmentReceipts,
  isStubDepartmentReceipt,
} from '../factory-staging/factory-core/arc/department-simulations.js';
import {
  writeModeAToBTransitionReceipt,
  writePredictionReceipt,
} from '../factory-staging/factory-core/arc/foundation/prediction-receipt.js';
import { buildUpstreamRoute } from '../factory-staging/factory-core/arc/upstream-routing.js';

const INBOX = path.join(process.cwd(), 'builderos-reboot/MISSIONS/PRODUCT-ACTION-INBOX-V1-0001');
const LIFERE = path.join(process.cwd(), 'builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001');

describe('department + upstream doctrine', () => {
  it('stub department receipts are detected', () => {
    assert.equal(isStubDepartmentReceipt({ attacks_run: 5, verdict: 'yes' }, 'SNT'), true);
    assert.equal(
      isStubDepartmentReceipt({ attacks: [{ claim: 'x', pass: true }], simulated_by: 'x', simulation_tier: 'COUNCIL_SIM' }, 'SNT'),
      false,
    );
    assert.equal(
      isStubDepartmentReceipt({ attacks: [{ claim: 'x', pass: true }], simulated_by: 'x', simulation_tier: 'BOOTSTRAP_MECHANICAL' }, 'SNT'),
      true,
    );
  });

  it('department sims produce non-stub receipts for Action Inbox', () => {
    writeModeAToBTransitionReceipt(INBOX);
    writePredictionReceipt(INBOX);
    const result = runDepartmentSimulations(INBOX);
    assert.equal(result.all_pass, true);
    const v = validateDepartmentReceipts(INBOX);
    assert.equal(v.pass, true);
  });

  it('pre-handoff failure attributes Chair not founder', () => {
    const pre = evaluatePreHandoffIntentGate(INBOX);
    assert.equal(pre.defect_owner_seat, pre.pass ? null : 'Chair');
    assert.equal(pre.pushed_by, 'ARC');
  });

  it('upstream route frames Chair failure when escalating', () => {
    const route = buildUpstreamRoute({
      missionId: 'TEST',
      violations: ['development:intent_not_clear'],
      chairCanSynthesize: false,
    });
    assert.equal(route.defect_owner_seat, 'Chair');
    assert.match(route.founder_frame, /Chair failed/i);
  });

  it('corridor gate does not re-litigate intent sections', () => {
    const corridor = evaluateCorridorEntered(INBOX);
    assert.ok(!corridor.violations.some((v) => v.includes('intent_incomplete')));
  });

  it('stub SNT translation rejects null evidence on blocking passes', () => {
    assert.equal(
      isStubSntReceipt({
        attacks: [{ severity: 'blocking', pass: true, evidence_if_wrong: null }],
        verdict: 'builder_clearance_yes',
      }),
      true,
    );
    assert.equal(
      isStubSntReceipt({
        attacks: [{ severity: 'blocking', pass: true, evidence_if_wrong: 'npm run lifeos:x-acceptance' }],
        verdict: 'builder_clearance_yes',
      }),
      false,
    );
  });

  it('clean no-gap builder simulation is not treated as empty', () => {
    assert.equal(
      isEmptyBuilderSim(
        {
          steps: [],
          summary: {
            evaluated_steps: 2,
            total_gaps: 0,
            clear_to_build: true,
          },
        },
        {
          steps: [{ step_id: 'A' }, { step_id: 'B' }],
        },
      ),
      false,
    );
  });

  it('active Point B mission is not treated as proof lap', () => {
    const report = evaluatePointBGate(LIFERE, {
      blueprint: JSON.parse(fs.readFileSync(path.join(LIFERE, 'BLUEPRINT.json'), 'utf8')),
    });
    assert.equal(report.proof_lap_only, false);
  });
});
