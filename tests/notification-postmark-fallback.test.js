/**
 * SYNOPSIS: Invalid Postmark token must fall through to Resend, not swallow WRM consults.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationService } from '../core/notification-service.js';

test('invalid Postmark server token falls back to Resend', async () => {
  const prev = {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    WORK_EMAIL: process.env.WORK_EMAIL,
    WORK_EMAIL_APP_PASSWORD: process.env.WORK_EMAIL_APP_PASSWORD,
  };
  process.env.EMAIL_PROVIDER = 'postmark';
  process.env.POSTMARK_SERVER_TOKEN = 'invalid-token';
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'LifeOS@hopkinsgroup.org';
  delete process.env.SENDGRID_API_KEY;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.WORK_EMAIL;
  delete process.env.WORK_EMAIL_APP_PASSWORD;

  const origFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push(String(url));
    if (String(url).includes('postmarkapp.com')) {
      return {
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ Message: 'Request does not contain a valid Server token.' }),
        json: async () => ({ Message: 'Request does not contain a valid Server token.' }),
      };
    }
    if (String(url).includes('api.resend.com')) {
      const body = JSON.parse(opts.body);
      assert.equal(body.to[0], 'maternity@wellroundedwoman.com');
      return { ok: true, json: async () => ({ id: 're_test_msg' }) };
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    const svc = new NotificationService({ pool: { query: async () => { throw new Error('no db'); } } });
    const result = await svc.sendEmail({
      to: 'Maternity@wellroundedwoman.com',
      subject: 'New consult request — test',
      text: 'lead',
      html: '<p>lead</p>',
      campaignId: 'wrm-consult',
    });
    assert.equal(result.success, true, result.error);
    assert.equal(result.provider, 'resend');
    assert.equal(result.fallback_from, 'postmark_failed');
    assert.ok(calls.some((u) => u.includes('postmarkapp.com')));
    assert.ok(calls.some((u) => u.includes('api.resend.com')));
  } finally {
    globalThis.fetch = origFetch;
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
