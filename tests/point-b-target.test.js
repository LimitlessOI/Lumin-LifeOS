/**
 * SYNOPSIS: Point B target must not claim Alpha before founder usability pass.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { evaluatePointBTargetReached } from '../factory-staging/factory-core/arc/foundation/point-b-target.js';

test('technical pass without founder usability does not claim point b reached', () => {
  const missionFolder = path.resolve('builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001');
  const result = evaluatePointBTargetReached(missionFolder);
  assert.equal(result.objective_verdict, 'TECHNICAL_PASS');
  assert.equal(result.founder_usability_pass, false);
  assert.equal(result.alpha_reached, false);
  assert.equal(result.ok, false);
  assert.match(result.lesson, /awaiting founder usability confirmation/i);
});
