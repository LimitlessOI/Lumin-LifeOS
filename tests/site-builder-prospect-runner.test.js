/**
 * SYNOPSIS: js — tests/site-builder-prospect-runner.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProspectClientId,
  evaluateSiteBuilderEmailReadiness,
  enqueueDeferredProspectJob,
} from '../services/site-builder-prospect-runner.js';

describe('site-builder-prospect-runner', () => {
  it('createProspectClientId returns prev_ prefix id', () => {
    const id = createProspectClientId();
    assert.match(id, /^prev_\d+_[a-z0-9]+$/);
  });

  it('evaluateSiteBuilderEmailReadiness accepts Gmail SMTP keys but requires proved send on tip', () => {
    const result = evaluateSiteBuilderEmailReadiness({
      EMAIL_PROVIDER: 'smtp',
      EMAIL_FROM: 'Lumea LifeOS <lumea.lifeos@gmail.com>',
      SMTP_USER: 'lumea.lifeos@gmail.com',
      SMTP_PASS: 'secret',
    });
    assert.equal(result.ready, true);
    assert.equal(result.keysPresent, true);
    assert.equal(result.coldEmailSending, false);
    assert.equal(result.provider, 'smtp');
  });

  it('evaluateSiteBuilderEmailReadiness requires Postmark token when provider is postmark', () => {
    const result = evaluateSiteBuilderEmailReadiness({
      EMAIL_PROVIDER: 'postmark',
      EMAIL_FROM: 'hello@example.com',
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((b) => b.name === 'POSTMARK_SERVER_KEY' || b.name === 'POSTMARK_SERVER_TOKEN'));
  });

  it('evaluateSiteBuilderEmailReadiness does not claim sending for bare Postmark token', () => {
    const result = evaluateSiteBuilderEmailReadiness({
      EMAIL_PROVIDER: 'postmark',
      EMAIL_FROM: 'hello@example.com',
      POSTMARK_SERVER_TOKEN: 'pm-token',
    });
    assert.equal(result.ready, true);
    assert.equal(result.keysPresent, true);
    assert.equal(result.coldEmailSending, false);
  });

  it('evaluateSiteBuilderEmailReadiness treats Resend as sendable on Railway', () => {
    const result = evaluateSiteBuilderEmailReadiness({
      EMAIL_PROVIDER: 'resend',
      EMAIL_FROM: 'hello@example.com',
      RESEND_API_KEY: 're_test',
    });
    assert.equal(result.ready, true);
    assert.equal(result.coldEmailSending, true);
  });

  it('enqueueDeferredProspectJob reserves + invites without calling processProspect', async () => {
    let reserved = null;
    let invited = null;
    let processCalls = 0;
    const pipeline = {
      reserveProspectJob: async (opts) => {
        reserved = opts;
        return {
          ok: true,
          clientId: opts.clientId,
          status: 'queued',
          previewUrl: `https://example.test/previews/${opts.clientId}`,
        };
      },
      sendDeferredInvite: async (opts) => {
        invited = opts;
        return {
          success: true,
          clientId: opts.clientId,
          previewUrl: opts.previewUrl,
          emailSent: true,
        };
      },
      processProspect: async () => {
        processCalls += 1;
        return { success: true };
      },
      resolvePreviewUrl: (id) => `https://example.test/previews/${id}`,
    };

    const job = await enqueueDeferredProspectJob(pipeline, {
      businessUrl: 'https://demo.example',
      contactEmail: 'owner@demo.example',
      businessName: 'Demo Clinic',
    });

    assert.equal(job.ok, true);
    assert.equal(job.deferred, true);
    assert.equal(job.emailSent, true);
    assert.equal(reserved.deferredBuild, true);
    assert.equal(reserved.leanTemplate, true);
    assert.equal(reserved.skipAi, true);
    assert.equal(invited.contactEmail, 'owner@demo.example');
    assert.equal(processCalls, 0);
  });
});