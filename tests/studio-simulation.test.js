/**
 * SYNOPSIS: js — tests/studio-simulation.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runStudioSimulation } from '../factory-staging/factory-core/arc/foundation/studio-simulation.js';

const LIFERE = `${process.cwd()}/builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001`;
const ACTION_INBOX = `${process.cwd()}/builderos-reboot/MISSIONS/PRODUCT-ACTION-INBOX-V1-0001`;

describe('studio simulation scope', () => {
  it('does not invent staging visibility friction for direct product-host missions', () => {
    const receipt = runStudioSimulation(LIFERE);
    assert.equal(receipt.in_scope, true);
    assert.equal(receipt.pass, true);
    assert.equal(receipt.verdict, 'experience_acceptable');
    assert.equal(
      receipt.checks.some((check) => check.check === 'Founder can see staged items in one place'),
      false,
    );
  });

  it('keeps staging visibility and approval checks for inbox-style approval workflows', () => {
    const receipt = runStudioSimulation(ACTION_INBOX);
    assert.equal(receipt.in_scope, true);
    assert.equal(receipt.pass, true);
    assert.equal(
      receipt.checks.some((check) => check.check === 'Founder can see staged items in one place'),
      true,
    );
    assert.equal(
      receipt.checks.some((check) => check.check === 'Approval gate before action'),
      true,
    );
  });
});
