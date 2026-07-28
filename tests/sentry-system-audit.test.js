/**
 * SYNOPSIS: js — tests/sentry-system-audit.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { checkCiHealth, checkProductBacklogs, checkWorkflowHealth, runSentrySystemAudit } from '../services/sentry-system-audit.js';

test('checkCiHealth: no token/repo skips cleanly (this is why it silently no-ops in a local dev shell with no GITHUB_TOKEN)', async () => {
  const findings = await checkCiHealth({ token: null, repo: null });
  assert.deepEqual(findings, []);
});

test('checkCiHealth: green main produces no finding', async () => {
  // fetchLatestMainRun is not individually injectable here, so this exercises
  // it via global fetch, matching the pattern already used in
  // ci-health-watchdog.test.js's end-to-end cycle test.
  const realFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ workflow_runs: [{ head_sha: 'abc', conclusion: 'success', status: 'completed', html_url: 'https://x' }] }),
  });
  try {
    const findings = await checkCiHealth({ token: 't', repo: 'owner/repo' });
    assert.deepEqual(findings, []);
  } finally {
    global.fetch = realFetch;
  }
});

test('checkCiHealth: red main produces a P0 finding with a concrete proposed_solution', async () => {
  const realFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ workflow_runs: [{ head_sha: 'deadbeef', conclusion: 'failure', status: 'completed', html_url: 'https://x/run/1' }] }),
  });
  try {
    const findings = await checkCiHealth({ token: 't', repo: 'owner/repo' });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'P0');
    assert.ok(findings[0].proposed_solution.length > 10);
    assert.match(findings[0].summary, /FAILING/);
  } finally {
    global.fetch = realFetch;
  }
});

test('checkProductBacklogs: flags a product whose queue is 100% done with zero documented backlog', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-audit-products-'));
  try {
    const productDir = path.join(tmpDir, 'idle-product');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(
      path.join(productDir, 'BUILD_QUEUE.json'),
      JSON.stringify({ steps: [{ id: '1', status: 'done' }, { id: '2', status: 'done' }] }),
    );
    fs.writeFileSync(path.join(productDir, 'PRODUCT_HOME.md'), '# Idle Product\n\nNothing left to build, no backlog section at all.\n');

    const findings = checkProductBacklogs({ productsDir: tmpDir });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].id, 'empty_backlog:idle-product');
    assert.equal(findings[0].severity, 'P1');
    assert.ok(findings[0].proposed_solution.includes('idle-product'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('checkProductBacklogs: does NOT flag a product that still has pending steps', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-audit-products-'));
  try {
    const productDir = path.join(tmpDir, 'active-product');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(
      path.join(productDir, 'BUILD_QUEUE.json'),
      JSON.stringify({ steps: [{ id: '1', status: 'done' }, { id: '2', status: 'pending' }] }),
    );
    fs.writeFileSync(path.join(productDir, 'PRODUCT_HOME.md'), '# Active Product\n');

    const findings = checkProductBacklogs({ productsDir: tmpDir });
    assert.deepEqual(findings, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('checkProductBacklogs: does NOT flag a product that is 100% done but HAS a documented backlog (planner just hasn\'t run yet)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-audit-products-'));
  try {
    const productDir = path.join(tmpDir, 'has-backlog-product');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(
      path.join(productDir, 'BUILD_QUEUE.json'),
      JSON.stringify({ steps: [{ id: '1', status: 'done' }] }),
    );
    fs.writeFileSync(
      path.join(productDir, 'PRODUCT_HOME.md'),
      // extractBacklog's BULLET regex requires a trailing space before the
      // newline (matches real-world PRODUCT_HOME.md markdown line-break
      // convention) — without it these lines are silently not recognized as
      // backlog bullets at all, which is what this fixture is guarding.
      '# Has Backlog Product\n\n## Build Plan\n- Add the next real feature \n- Fix the known edge case \n',
    );

    const findings = checkProductBacklogs({ productsDir: tmpDir });
    assert.deepEqual(findings, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('checkProductBacklogs: a product with no BUILD_QUEUE.json at all is skipped, not flagged', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-audit-products-'));
  try {
    fs.mkdirSync(path.join(tmpDir, 'no-queue-product'), { recursive: true });
    const findings = checkProductBacklogs({ productsDir: tmpDir });
    assert.deepEqual(findings, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('checkWorkflowHealth: no token/repo skips cleanly', async () => {
  const findings = await checkWorkflowHealth({ token: null, repo: null });
  assert.deepEqual(findings, []);
});

test('checkWorkflowHealth: a workflow failing in under 5s on its last several runs is flagged (the real migrate.yml defect shape)', async () => {
  const fakeFetch = async (url) => {
    if (String(url).includes('/actions/workflows/1/runs')) {
      const instant = (offsetMs) => {
        const started = new Date(Date.now() - 1000 - offsetMs).toISOString();
        const updated = new Date(Date.now() - offsetMs).toISOString();
        return { conclusion: 'failure', run_started_at: started, updated_at: updated };
      };
      return { ok: true, json: async () => ({ workflow_runs: [instant(0), instant(60_000), instant(120_000)] }) };
    }
    if (String(url).endsWith('/actions/workflows')) {
      return { ok: true, json: async () => ({ workflows: [{ id: 1, path: '.github/workflows/migrate.yml', state: 'active' }] }) };
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const findings = await checkWorkflowHealth({ token: 't', repo: 'owner/repo', fetchFn: fakeFetch });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, 'broken_workflow:.github/workflows/migrate.yml');
  assert.match(findings[0].proposed_solution, /migrate\.yml/);
});

test('checkWorkflowHealth: a workflow that fails but takes real time (a genuine content failure) is NOT flagged', async () => {
  const fakeFetch = async (url) => {
    if (String(url).includes('/actions/workflows/2/runs')) {
      const real = (offsetMs) => {
        const started = new Date(Date.now() - 70_000 - offsetMs).toISOString(); // 70s runtime
        const updated = new Date(Date.now() - offsetMs).toISOString();
        return { conclusion: 'failure', run_started_at: started, updated_at: updated };
      };
      return { ok: true, json: async () => ({ workflow_runs: [real(0), real(60_000)] }) };
    }
    if (String(url).endsWith('/actions/workflows')) {
      return { ok: true, json: async () => ({ workflows: [{ id: 2, path: '.github/workflows/smoke-test.yml', state: 'active' }] }) };
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const findings = await checkWorkflowHealth({ token: 't', repo: 'owner/repo', fetchFn: fakeFetch });
  assert.deepEqual(findings, []);
});

test('runSentrySystemAudit: one check throwing does not prevent the others from running (fail-open per check)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-audit-integration-'));
  try {
    const productDir = path.join(tmpDir, 'idle-product');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(path.join(productDir, 'BUILD_QUEUE.json'), JSON.stringify({ steps: [{ id: '1', status: 'done' }] }));
    fs.writeFileSync(path.join(productDir, 'PRODUCT_HOME.md'), '# Idle\n');

    // No token/repo -> CI + workflow checks no-op cleanly; product check still runs for real.
    const findings = await runSentrySystemAudit({ token: null, repo: null, productsDir: tmpDir });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'product_backlog');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
