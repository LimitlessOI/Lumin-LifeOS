import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { evaluatePointBGate, evaluateCorridorEntered } from '../factory-staging/factory-core/arc/point-b-gate.js';
import { evaluatePreHandoffIntentGate } from '../factory-staging/factory-core/arc/pre-handoff-intent-gate.js';
import {
  runDepartmentSimulations,
  validateDepartmentReceipts,
  isStubDepartmentReceipt,
} from '../factory-staging/factory-core/arc/department-simulations.js';
import { buildUpstreamRoute } from '../factory-staging/factory-core/arc/upstream-routing.js';

const INTAKE = path.join(process.cwd(), 'builderos-reboot/MISSIONS/BUILDEROS-INTAKE-LOOP-V1-0001');
const INBOX = path.join(process.cwd(), 'builderos-reboot/MISSIONS/PRODUCT-ACTION-INBOX-V1-0001');

describe('department + upstream doctrine', () => {
  it('stub department receipts are detected', () => {
    assert.equal(isStubDepartmentReceipt({ attacks_run: 5, verdict: 'yes' }, 'SNT'), true);
    assert.equal(
      isStubDepartmentReceipt({ attacks: [{ claim: 'x', pass: true }], simulated_by: 'x' }, 'SNT'),
      false,
    );
  });

  it('department sims produce non-stub receipts for Action Inbox', () => {
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

  it('proof lap is not product machine path', () => {
    const report = evaluatePointBGate(INTAKE, {
      blueprint: JSON.parse(fs.readFileSync(path.join(INTAKE, 'BLUEPRINT.json'), 'utf8')),
    });
    assert.equal(report.status, 'PROOF_LAP_NOT_PRODUCT_PATH');
  });
});
