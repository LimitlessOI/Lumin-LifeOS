/**
 * SYNOPSIS: js — tests/chair-direct-connection-truth.test.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  scrubCounselTheater,
  detectCounselTheater,
  formatDirectConnectionReply,
} from '../services/chair-direct-connection-truth.js';

describe('chair-direct-connection-truth', () => {
  it('blocks open LifeRE theater on NO_COMMAND_RAN', () => {
    const lie = 'LifeOS is now open. What would you like to do first, Adam?';
    assert.equal(detectCounselTheater(lie, 'NO_COMMAND_RAN').violation, true);
    assert.equal(scrubCounselTheater(lie, 'NO_COMMAND_RAN'), '');
  });

  it('preserves honest counsel prose', () => {
    const ok = 'Oil changes every 5k–7k miles is typical — check your manual.';
    assert.equal(detectCounselTheater(ok, 'NO_COMMAND_RAN').violation, false);
    assert.equal(scrubCounselTheater(ok, 'NO_COMMAND_RAN'), ok);
  });

  it('formats counsel header without faking execution (legacy non-direct path)', () => {
    const out = formatDirectConnectionReply(
      { command_truth: 'NO_COMMAND_RAN', chair_channel: 'lumin', direct_connection: false },
      'Oil changes every 5k miles is typical.',
    );
    assert.match(out, /Counsel only · No command ran/);
    assert.match(out, /Oil changes every 5k miles/);
    assert.doesNotMatch(out, /LifeOS is now open/i);
  });

  it('formats direct Lumin connection without counsel-only boilerplate', () => {
    const out = formatDirectConnectionReply(
      { command_truth: 'NO_COMMAND_RAN', chair_channel: 'chair', direct_connection: true, lumin_chair: true },
      'Oil changes every 5k miles is typical.',
    );
    assert.doesNotMatch(out, /Counsel only/i);
    assert.match(out, /Oil changes every 5k miles/);
    assert.doesNotMatch(out, /To execute: say `do:/i);
  });

  it('formats COMMAND_RAN with personality body', () => {
    const out = formatDirectConnectionReply(
      { command_truth: 'COMMAND_RAN', chair_channel: 'system_action', action_type: 'open_lifere' },
      'Opening LifeRE now — navigation is executing in your shell.',
    );
    assert.match(out, /Done · Command: COMMAND_RAN/);
  });
});
