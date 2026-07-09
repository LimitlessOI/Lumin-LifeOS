/**
 * SYNOPSIS: js — tests/go-vegas-outreach.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGoVegasConfig,
  buildInviteEmail,
  buildFollowUpEmail,
  evaluateSendQuota,
  GO_VEGAS_DEFAULT_FROM_EMAIL,
} from '../config/go-vegas-campaign.js';
import { extractEmailsFromHtml } from '../services/go-vegas-email-finder.js';

describe('go-vegas-campaign', () => {
  it('uses Adam direct email and Go Vegas group by default', () => {
    const cfg = getGoVegasConfig({});
    assert.equal(cfg.fromAddress, GO_VEGAS_DEFAULT_FROM_EMAIL);
    assert.match(cfg.fromEmail, /adam@hopkinsgroup\.org/);
    assert.equal(cfg.facebookGroupUrl, 'https://www.facebook.com/groups/govegas');
    assert.equal(cfg.ready, true);
  });

  it('enforces conservative daily send caps', () => {
    const cfg = getGoVegasConfig({});
    assert.equal(cfg.sendLimits.maxInvitesPerDay, 8);
    assert.equal(cfg.sendLimits.maxFollowUpsPerDay, 5);
    assert.equal(cfg.sendLimits.maxTotalPerDay, 12);

    const blocked = evaluateSendQuota({ invites: 8, followUps: 0, total: 8 }, cfg.sendLimits);
    assert.equal(blocked.canSendInvite, false);

    const totalBlocked = evaluateSendQuota({ invites: 5, followUps: 7, total: 12 }, cfg.sendLimits);
    assert.equal(totalBlocked.canSendFollowUp, false);
    assert.equal(totalBlocked.canSendInvite, false);
  });

  it('buildInviteEmail includes benefits and group link', () => {
    const cfg = getGoVegasConfig({});
    const email = buildInviteEmail({ businessName: 'Desert Spa', contactName: 'Maria', config: cfg });
    assert.match(email.subject, /Desert Spa/);
    assert.match(email.text, /facebook.com\/groups\/govegas/);
    assert.match(email.text, /free/i);
  });

  it('buildFollowUpEmail varies by number', () => {
    const cfg = getGoVegasConfig({});
    const f1 = buildFollowUpEmail({ businessName: 'Ace HVAC', followUpNumber: 1, config: cfg });
    const f3 = buildFollowUpEmail({ businessName: 'Ace HVAC', followUpNumber: 3, config: cfg });
    assert.notEqual(f1.subject, f3.subject);
    assert.match(f3.text, /Last follow-up/i);
  });
});

describe('go-vegas-email-finder', () => {
  it('prefers info@ over noreply@', () => {
    const html = '<a href="mailto:noreply@x.com">x</a> contact us at info@desertspa.com';
    const emails = extractEmailsFromHtml(html, 'Desert Spa');
    assert.equal(emails[0], 'info@desertspa.com');
  });
});
