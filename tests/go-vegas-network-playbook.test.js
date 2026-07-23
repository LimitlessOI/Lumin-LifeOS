/**
 * SYNOPSIS: js — tests/go-vegas-network-playbook.test.js.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RECOGNITION_QUESTION_BANK,
  RECOMMENDATION_ASK_BANK,
  DAILY_SUBPROMO_THREADS,
  pickRecognitionQuestion,
  pickSubPromoThread,
  pickRecommendationAsk,
  buildRecognitionOutreachEmail,
  buildRecommendationSoftOpenEmail,
  GO_VEGAS_CADENCE,
  PRODUCT_ACCOUNT_NAMES,
} from '../config/go-vegas-network-playbook.js';

describe('go-vegas network playbook', () => {
  it('targets 31+ owned posts so Meta shows an active group', () => {
    assert.ok(GO_VEGAS_CADENCE.groupOwnedPostsFloor >= 31);
    assert.ok(GO_VEGAS_CADENCE.memberPostsTarget >= 20);
  });

  it('has recognition questions, rec-asks, and rotating sub-promo threads', () => {
    assert.ok(RECOGNITION_QUESTION_BANK.length >= 6);
    assert.ok(RECOMMENDATION_ASK_BANK.length >= 6);
    assert.ok(DAILY_SUBPROMO_THREADS.length >= 4);
    assert.ok(pickRecognitionQuestion(0).includes('?'));
    assert.ok(pickRecommendationAsk(2).niche);
    assert.ok(pickSubPromoThread(1).prompt);
  });

  it('keeps Adam heavy + product accounts separate', () => {
    assert.equal(PRODUCT_ACCOUNT_NAMES.sites, 'SiteBuilder by Taloa');
    assert.ok(GO_VEGAS_CADENCE.adamPerDay.target >= 10);
    assert.ok(GO_VEGAS_CADENCE.productAccountsCombinedPerDay.target >= 20);
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

  it('builds soft-open from group recommendation + spec site', () => {
    const mail = buildRecommendationSoftOpenEmail({
      businessName: 'Valley Drain Pros',
      recommenderName: 'Maria',
      niche: 'plumbing',
      previewUrl: 'https://example.com/previews/x',
      theirScore: 3,
      competitorScore: 8,
      upgrades: ['Clear call button', 'Before/after proof', 'Same-day CTA'],
    });
    assert.match(mail.subject, /Maria/);
    assert.match(mail.text, /recommended I reach out/);
    assert.match(mail.text, /3\/10/);
    assert.match(mail.text, /Before\/after/);
    assert.match(mail.text, /example\.com\/previews\/x/);
  });
});