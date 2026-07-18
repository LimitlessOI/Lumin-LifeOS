/**
 * SYNOPSIS: LifeOS connect guide unit tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConnectGuide, inboxUrlForEmail } from '../services/lifeos-connect-guide.js';

describe('lifeos-connect-guide', () => {
  it('builds email step for email_sent status', () => {
    const g = buildConnectGuide({
      service_name: 'smartlead',
      email_used: 'LifeOS@hopkinsgroup.org',
      service_url: 'https://app.smartlead.ai/sign-up',
      status: 'email_sent',
      last_action: 'magic_link_sent',
    });
    assert.ok(g.steps.some((s) => s.id === 'open_email'));
    assert.equal(g.nextHumanStep?.id, 'open_email');
    assert.match(g.inboxUrl, /mail\.google\.com/);
  });

  it('inbox url for hopkinsgroup', () => {
    assert.match(inboxUrlForEmail('LifeOS@hopkinsgroup.org'), /mail\.google\.com/);
  });
});
