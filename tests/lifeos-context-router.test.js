/**
 * SYNOPSIS: js — tests/lifeos-context-router.test.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { suggestStack, suggestView } from '../services/lifeos-context-router.js';

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
    assert.equal(res.page, 'lifeos-dashboard.html');
  });

  it('suggests a concrete page for finance intent', () => {
    const res = suggestStack({ text: 'show me my money and budget today' });
    assert.equal(res.stack_id, 'lifeos');
    assert.equal(res.page, 'lifeos-finance.html');
    assert.equal(res.title, 'Finance');
  });

  it('suggests builder command rail for build intents', () => {
    const res = suggestStack({ text: 'continue the blueprint and show me the next build step' });
    assert.equal(res.stack_id, 'builderos');
    assert.equal(res.page, 'lifeos-dashboard.html');
    assert.equal(res.open_drawer, true);
  });

  it('can suggest a focused page independently', () => {
    const res = suggestView({ text: 'i need help with a conflict with my wife' });
    assert.equal(res.page, 'lifeos-conflict.html');
    assert.equal(res.title, 'Conflict support');
  });
});
