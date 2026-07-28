/**
 * SYNOPSIS: Instantly cold-outreach adapter unit tests.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getInstantlyConfig,
  enqueueInstantlyLead,
} from '../services/site-builder-instantly-outreach.js';
import { evaluateSiteBuilderEmailReadiness } from '../services/site-builder-prospect-runner.js';

describe('site-builder-instantly-outreach', () => {
  it('getInstantlyConfig requires both key and campaign', () => {
    assert.equal(getInstantlyConfig({}).configured, false);
    assert.equal(getInstantlyConfig({ INSTANTLY_API_KEY: 'k' }).configured, false);
    assert.equal(getInstantlyConfig({
      INSTANTLY_API_KEY: 'k',
      INSTANTLY_CAMPAIGN_ID: '019f94cd-6edf-7803-a9b0-d731bdc16746',
    }).configured, true);
  });

  it('enqueueInstantlyLead posts Bearer auth + campaign lead', async () => {
    let seen = null;
    const result = await enqueueInstantlyLead({
      email: 'info@lvhandymanservices.com',
      subject: 'LV Handyman — beta preview',
      html: '<p>Preview: https://example.test/previews/prev_abc/</p>',
      businessName: 'LV Handyman Services',
      businessUrl: 'http://lvhandymanservices.com',
      contactName: 'Owner',
      clientId: 'prev_abc',
      env: {
        INSTANTLY_API_KEY: 'test-key',
        INSTANTLY_CAMPAIGN_ID: '019f94cd-6edf-7803-a9b0-d731bdc16746',
      },
      fetchImpl: async (url, opts) => {
        seen = { url, opts };
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'lead-1' }),
        };
      },
    });
    assert.equal(result.success, true);
    assert.equal(result.provider, 'instantly');
    assert.equal(result.leadId, 'lead-1');
    assert.match(seen.url, /api\.instantly\.ai\/api\/v2\/leads/);
    assert.equal(seen.opts.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(seen.opts.body);
    assert.equal(body.email, 'info@lvhandymanservices.com');
    assert.equal(body.campaign, '019f94cd-6edf-7803-a9b0-d731bdc16746');
    assert.equal(body.custom_variables.preview_url, 'https://example.test/previews/prev_abc/');
  });

  it('evaluateSiteBuilderEmailReadiness treats Instantly as cold sendable', () => {
    const result = evaluateSiteBuilderEmailReadiness({
      INSTANTLY_API_KEY: 'k',
      INSTANTLY_CAMPAIGN_ID: '019f94cd-6edf-7803-a9b0-d731bdc16746',
      EMAIL_FROM: 'ignored@example.com',
    });
    assert.equal(result.provider, 'instantly');
    assert.equal(result.coldEmailSending, true);
    assert.equal(result.ready, true);
  });
});