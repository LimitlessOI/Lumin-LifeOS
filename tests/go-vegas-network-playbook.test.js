/**
 * SYNOPSIS: js — tests/go-vegas-network-playbook.test.js.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RECOGNITION_QUESTION_BANK,
  DAILY_SUBPROMO_THREADS,
  pickRecognitionQuestion,
  pickSubPromoThread,
  buildRecognitionOutreachEmail,
  GO_VEGAS_CADENCE,
  PRODUCT_ACCOUNT_NAMES,
} from '../config/go-vegas-network-playbook.js';

describe('go-vegas network playbook', () => {
  it('has recognition questions and rotating sub-promo threads', () => {
    assert.ok(RECOGNITION_QUESTION_BANK.length >= 6);
    assert.ok(DAILY_SUBPROMO_THREADS.length >= 4);
    assert.ok(pickRecognitionQuestion(0).includes('?'));
    assert.ok(pickSubPromoThread(1).prompt);
  });

  it('keeps Adam heavy + product accounts separate', () => {
    assert.equal(PRODUCT_ACCOUNT_NAMES.sites, 'SiteBuilder by Taloa');
    assert.ok(GO_VEGAS_CADENCE.adamPerDay.target >= 10);
    assert.ok(GO_VEGAS_CADENCE.productAccountPerDay.min >= 5);
    assert.equal(GO_VEGAS_CADENCE.promoOwner, 'human_admin');
  });

  it('builds recognition outreach with quote + join path', () => {
    const mail = buildRecognitionOutreachEmail({
      businessName: 'Desert Hot Coffee',
      partialQuote: 'they opened early for my crew',
    });
    assert.match(mail.subject, /Superior Place/);
    assert.match(mail.text, /Desert Hot Coffee/);
    assert.match(mail.text, /opened early/);
    assert.match(mail.text, /facebook\.com\/groups\/govegas/);
    assert.match(mail.text, /Best Of/);
  });
});