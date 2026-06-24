/**
 * SYNOPSIS: js — tests/lifeos-context-router.test.js.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { suggestStack } from '../services/lifeos-context-router.js';

describe('lifeos context router', () => {
  it('routes lifere keywords', () => {
    const res = suggestStack({ text: 'check my GCI and buyer pipeline' });
    assert.equal(res.stack_id, 'lifere');
    assert.match(res.shell_entry, /lifeos-lifere/);
  });

  it('routes explicit stack param', () => {
    const res = suggestStack({ explicitStack: 'lifere' });
    assert.equal(res.stack_id, 'lifere');
    assert.equal(res.reason, 'explicit');
  });

  it('defaults to lifeos platform', () => {
    const res = suggestStack({ text: 'good morning' });
    assert.equal(res.stack_id, 'lifeos');
  });
});
