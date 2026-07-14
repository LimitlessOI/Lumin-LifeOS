/**
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import express from 'express';
import {
  assessClaimStatusResult,
  createClientCareBillingRoutes,
} from '../routes/clientcare-billing-routes.js';

describe('ClientCare claim-status jobs', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    const pool = { query: async () => ({ rows: [], rowCount: 0 }) };
    app.use('/api/v1/clientcare-billing', createClientCareBillingRoutes({
      pool,
      requireKey: (_req, _res, next) => next(),
      logger: { error() {}, warn() {}, info() {} },
    }));
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/clientcare-billing`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  test('rejects oversized account batches instead of silently truncating them', async () => {
    const billingHrefs = Array.from({ length: 26 }, (_, index) => `https://clientcare.example/billing/${index}`);
    const response = await fetch(`${baseUrl}/browser/prepare-claim-status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ billing_hrefs: billingHrefs }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.match(body.error, /maximum of 25/i);
  });

  test('defaults claim preparation to dry-run', async () => {
    const response = await fetch(`${baseUrl}/browser/prepare-claim-status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ billing_href: 'https://clientcare.example/billing/1' }),
    });
    const body = await response.json();
    const poll = await fetch(`http://127.0.0.1:${server.address().port}${body.poll_url}`);
    const pollBody = await poll.json();

    assert.equal(response.status, 202);
    assert.equal(pollBody.job.request.dryRun, true);
  });

  test('fails a live result when a field was not applied', () => {
    const assessment = assessClaimStatusResult({
      ok: true,
      operations: [
        { kind: 'client_billing_status', applied: true },
        { kind: 'bill_provider_type', applied: false },
      ],
      saveResult: { attempted: true },
    }, { dryRun: false });

    assert.deepEqual(assessment, {
      ok: false,
      error: 'ClientCare field update failed: bill_provider_type',
    });
  });

  test('fails a live result when ClientCare did not expose a Save action', () => {
    const assessment = assessClaimStatusResult({
      ok: true,
      operations: [
        { kind: 'client_billing_status', applied: true },
        { kind: 'bill_provider_type', applied: true },
      ],
      saveResult: { attempted: false },
    }, { dryRun: false });

    assert.deepEqual(assessment, {
      ok: false,
      error: 'ClientCare Save action was not found or attempted',
    });
  });
});
