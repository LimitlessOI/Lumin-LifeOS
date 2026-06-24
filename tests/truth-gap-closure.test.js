/**
 * SYNOPSIS: Memory write gate + receipt validator tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gateMemoryWrite, sanitizeLegacyMemoryContent } from '../services/memory-write-gate.js';
import { validateReceiptObject } from '../services/receipt-truth-validator.js';

describe('memory-write-gate', () => {
  it('blocks theater memory (does not persist lies)', () => {
    const r = gateMemoryWrite('conversation_history', {
      user: 'open LifeRE',
      lumin: 'LifeOS is now open. What would you like to do first?',
    }, { aiOrigin: true, command_truth: 'NO_COMMAND_RAN' });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'THEATER_BLOCKED');
  });

  it('stamps honest counsel', () => {
    const r = gateMemoryWrite('conversation_history', {
      user: 'oil change?',
      lumin: 'Every 5k–7k miles is typical — check your manual.',
    }, { aiOrigin: true, epistemic_label: 'THINK', command_truth: 'NO_COMMAND_RAN' });
    assert.equal(r.allowed, true);
    assert.equal(r.stamp.epistemic_label, 'THINK');
  });

  it('sanitizes legacy lumin on read', () => {
    const out = sanitizeLegacyMemoryContent({
      user: 'x',
      lumin: 'LifeOS is now open.',
    }, 'conversation_history');
    assert.doesNotMatch(out.lumin, /LifeOS is now open/i);
  });
});

describe('receipt-truth-validator', () => {
  it('flags PASS without sha on acceptance', () => {
    const r = validateReceiptObject({ verdict: 'PASS', founder_usability_pass: false }, 'FOO_ACCEPTANCE.json');
    assert.equal(r.ok, false);
    assert.match(r.violations.join(','), /SHA_OR_BASE/);
  });

  it('passes parity receipt shape', () => {
    const r = validateReceiptObject({
      schema: 'lumin_chair_direct_connection_parity_v1',
      ok: true,
      passed: ['T1'],
      failed: [],
    }, 'LUMIN_CHAIR_PARITY.json');
    assert.equal(r.ok, true);
  });
});
