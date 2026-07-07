/**
 * SYNOPSIS: js — tests/site-builder-prospect-runner.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProspectClientId,
  evaluateSiteBuilderEmailReadiness,
} from '../services/site-builder-prospect-runner.js';

describe('site-builder-prospect-runner', () => {
  it('createProspectClientId returns prev_ prefix id', () => {
    const id = createProspectClientId();
    assert.match(id, /^prev_\d+_[a-z0-9]+$/);
  });

  it('evaluateSiteBuilderEmailReadiness accepts Gmail SMTP config', () => {
    const result = evaluateSiteBuilderEmailReadiness({
      EMAIL_PROVIDER: 'smtp',
      EMAIL_FROM: 'Lumea LifeOS <lumea.lifeos@gmail.com>',
      SMTP_USER: 'lumea.lifeos@gmail.com',
      SMTP_PASS: 'secret',
    });
    assert.equal(result.ready, true);
    assert.equal(result.coldEmailSending, true);
    assert.equal(result.provider, 'smtp');
  });

  it('evaluateSiteBuilderEmailReadiness requires Postmark token when provider is postmark', () => {
    const result = evaluateSiteBuilderEmailReadiness({
      EMAIL_PROVIDER: 'postmark',
      EMAIL_FROM: 'hello@example.com',
    });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some((b) => b.name === 'POSTMARK_SERVER_TOKEN'));
  });
});
