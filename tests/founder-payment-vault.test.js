/**
 * SYNOPSIS: js — tests/founder-payment-vault.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFounderPaymentVault, maskCard, evaluateFounderPaymentReadiness } from '../services/founder-payment-vault.js';
import { detectPaymentBoundary, extractPaymentProposal } from '../services/browser-payment-boundary.js';

describe('founder-payment-vault', () => {
  it('maskCard hides all but last4', () => {
    assert.equal(maskCard('4242424242424242'), '****4242');
  });

  it('ready when all env vars present', () => {
    const vault = getFounderPaymentVault({
      FOUNDER_PAYMENT_CARD_NUMBER: '4242424242424242',
      FOUNDER_PAYMENT_CARD_EXP: '12/28',
      FOUNDER_PAYMENT_CARD_CVC: '123',
      FOUNDER_PAYMENT_CARD_NAME: 'Adam Hopkins',
    });
    assert.equal(vault.ready, true);
    assert.equal(vault.masked.last4, '****4242');
  });

  it('evaluateFounderPaymentReadiness lists blockers', () => {
    const r = evaluateFounderPaymentReadiness({});
    assert.equal(r.ready, false);
    assert.ok(r.blockers.length >= 4);
  });
});

describe('browser-payment-boundary', () => {
  it('detects checkout page', () => {
    const r = detectPaymentBoundary({
      url: 'https://example.com/checkout',
      text: 'Enter credit card',
      elements: [{ name: 'cardnumber', type: 'text', id: '', text: '' }],
    });
    assert.equal(r.isPayment, true);
  });

  it('extractPaymentProposal finds dollar amounts', () => {
    const r = extractPaymentProposal({
      url: 'https://postmarkapp.com/pricing',
      text: 'Pro plan $16.50/mo includes 10,000 emails',
      title: 'Pricing',
    });
    assert.ok(r.proposedCosts.length >= 1);
  });
});
