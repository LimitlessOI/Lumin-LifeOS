/**
 * SYNOPSIS: Context guard allows navigate-to-host from blank page.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { makeAccountConfirmer } from '../services/general-browser-agent-runtime.js';
import { runBrowserGoal } from '../services/general-browser-agent.js';

describe('browser agent context guard', () => {
  it('allows navigate TO expected host from about:blank', async () => {
    const confirm = makeAccountConfirmer({ expectSiteHost: 'replicate.com' });
    const verdict = await confirm({
      observation: { url: 'about:blank', text: '' },
      action: { type: 'navigate', url: 'https://replicate.com/signin' },
    });
    assert.equal(verdict.ok, true);
  });

  it('blocks click when still off-host', async () => {
    const confirm = makeAccountConfirmer({ expectSiteHost: 'replicate.com' });
    const verdict = await confirm({
      observation: { url: 'about:blank', text: '' },
      action: { type: 'click', selector: 'button' },
    });
    assert.equal(verdict.ok, false);
    assert.equal(verdict.reason, 'context_mismatch');
  });

  it('startUrl navigate succeeds from blank when confirmer allows host navigate', async () => {
    const navigated = [];
    const result = await runBrowserGoal({
      goal: 'open replicate',
      startUrl: 'https://replicate.com/signin',
      expectedContext: { site: 'replicate.com' },
      observe: async () => ({ url: 'about:blank', text: '', elements: [] }),
      decideAction: async () => ({ type: 'done' }),
      act: async (action) => {
        navigated.push(action.url);
        return { ok: true };
      },
      verifyGoal: async () => ({ reached: true, evidence: {} }),
      confirmContext: makeAccountConfirmer({ expectSiteHost: 'replicate.com' }),
      maxSteps: 1,
    });
    assert.equal(navigated[0], 'https://replicate.com/signin');
    assert.notEqual(result.reason, 'context_unconfirmed:context_mismatch');
  });

  it('onAfterStep can stop the loop for payment handoff', async () => {
    const result = await runBrowserGoal({
      goal: 'signup',
      observe: async () => ({ url: 'https://replicate.com/billing', text: 'Add payment method', elements: [] }),
      decideAction: async () => ({ type: 'click', selector: 'button' }),
      act: async () => ({ ok: true }),
      verifyGoal: async () => ({ reached: false }),
      onAfterStep: async () => ({
        stop: true,
        ok: true,
        reason: 'awaiting_consent',
        handoff: { type: 'founder_authority_payment' },
      }),
      maxSteps: 3,
    });
    assert.equal(result.reason, 'awaiting_consent');
    assert.equal(result.handoff?.type, 'founder_authority_payment');
  });
});
