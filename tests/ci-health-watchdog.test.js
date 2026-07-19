/**
 * SYNOPSIS: js — tests/ci-health-watchdog.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  evaluateCIHealth,
  fetchLatestMainRun,
  sendFounderSms,
  sendFounderCall,
  runCiHealthWatchdogCycle,
  loadState,
  saveState,
} from '../scripts/ci-health-watchdog.mjs';

test('evaluateCIHealth: still-running run takes no action', () => {
  const { action, newState } = evaluateCIHealth({
    run: { sha: 'abc123', conclusion: null, status: 'in_progress' },
    state: { alertedShas: {} },
  });
  assert.equal(action, 'none');
  assert.deepEqual(newState, { alertedShas: {} });
});

test('evaluateCIHealth: no run at all takes no action', () => {
  const { action } = evaluateCIHealth({ run: null, state: { alertedShas: {} } });
  assert.equal(action, 'none');
});

test('evaluateCIHealth: green run with no prior alert takes no action', () => {
  const { action, newState } = evaluateCIHealth({
    run: { sha: 'abc123', conclusion: 'success', status: 'completed' },
    state: { alertedShas: {} },
  });
  assert.equal(action, 'none');
  assert.deepEqual(newState.alertedShas, {});
});

test('evaluateCIHealth: first red run triggers sms and records state', () => {
  const now = Date.now();
  const { action, newState } = evaluateCIHealth({
    run: { sha: 'deadbeef', conclusion: 'failure', status: 'completed' },
    state: { alertedShas: {} },
    now,
  });
  assert.equal(action, 'sms');
  assert.equal(newState.alertedShas.deadbeef.smsAt, now);
  assert.equal(newState.alertedShas.deadbeef.calledAt, null);
});

test('evaluateCIHealth: same red sha, sms already sent, under delay window — no repeat', () => {
  const smsAt = Date.now();
  const { action } = evaluateCIHealth({
    run: { sha: 'deadbeef', conclusion: 'failure', status: 'completed' },
    state: { alertedShas: { deadbeef: { smsAt, calledAt: null } } },
    now: smsAt + 60_000, // only 1 minute later
  });
  assert.equal(action, 'none');
});

test('evaluateCIHealth: same red sha, still unresolved past 10min — escalates to call', () => {
  const smsAt = Date.now() - 11 * 60 * 1000;
  const { action, newState } = evaluateCIHealth({
    run: { sha: 'deadbeef', conclusion: 'failure', status: 'completed' },
    state: { alertedShas: { deadbeef: { smsAt, calledAt: null } } },
    now: Date.now(),
  });
  assert.equal(action, 'call');
  assert.ok(newState.alertedShas.deadbeef.calledAt);
});

test('evaluateCIHealth: already called for this sha — no repeat call', () => {
  const now = Date.now();
  const { action } = evaluateCIHealth({
    run: { sha: 'deadbeef', conclusion: 'failure', status: 'completed' },
    state: { alertedShas: { deadbeef: { smsAt: now - 20 * 60 * 1000, calledAt: now - 5 * 60 * 1000 } } },
    now,
  });
  assert.equal(action, 'none');
});

test('evaluateCIHealth: recovery (green after a prior alert) clears state and fires recovered', () => {
  const { action, newState } = evaluateCIHealth({
    run: { sha: 'freshsha', conclusion: 'success', status: 'completed' },
    state: { alertedShas: { deadbeef: { smsAt: Date.now(), calledAt: null } } },
  });
  assert.equal(action, 'recovered');
  assert.deepEqual(newState.alertedShas, {});
});

test('fetchLatestMainRun: parses GitHub API response shape', async () => {
  const fakeFetch = async (url) => {
    assert.match(url, /repos\/owner\/repo\/actions\/workflows\/smoke-test\.yml\/runs\?branch=main/);
    return {
      ok: true,
      json: async () => ({
        workflow_runs: [
          { head_sha: 'sha1', conclusion: 'failure', status: 'completed', html_url: 'https://x', created_at: '2026-07-19T00:00:00Z' },
        ],
      }),
    };
  };
  const run = await fetchLatestMainRun({ token: 't', repo: 'owner/repo', fetchFn: fakeFetch });
  assert.equal(run.sha, 'sha1');
  assert.equal(run.conclusion, 'failure');
});

test('fetchLatestMainRun: no runs returns null', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ workflow_runs: [] }) });
  const run = await fetchLatestMainRun({ token: 't', repo: 'owner/repo', fetchFn: fakeFetch });
  assert.equal(run, null);
});

test('fetchLatestMainRun: non-ok response throws', async () => {
  const fakeFetch = async () => ({ ok: false, status: 401, text: async () => 'bad token' });
  await assert.rejects(() => fetchLatestMainRun({ token: 't', repo: 'owner/repo', fetchFn: fakeFetch }));
});

test('sendFounderSms: posts to the founder sms route with the command key header', async () => {
  let captured;
  const fakeFetch = async (url, opts) => {
    captured = { url, opts };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const result = await sendFounderSms({ baseUrl: 'https://x', commandKey: 'k', message: 'hi', fetchFn: fakeFetch });
  assert.equal(result.ok, true);
  assert.equal(captured.url, 'https://x/api/v1/lifeos/founder/sms');
  assert.equal(captured.opts.headers['x-command-center-key'], 'k');
  assert.deepEqual(JSON.parse(captured.opts.body), { body: 'hi' });
});

test('sendFounderCall: posts to the founder voice/call route', async () => {
  let captured;
  const fakeFetch = async (url, opts) => {
    captured = { url, opts };
    return { ok: true, json: async () => ({ ok: true, sid: 'CA123' }) };
  };
  const result = await sendFounderCall({ baseUrl: 'https://x', commandKey: 'k', to: '+15551234567', message: 'hi', fetchFn: fakeFetch });
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(captured.opts.body), { to: '+15551234567', say: 'hi' });
});

test('runCiHealthWatchdogCycle: skips cleanly when GitHub credentials are missing', async () => {
  const result = await runCiHealthWatchdogCycle({ token: null, repo: null, logger: { warn() {}, info() {} } });
  assert.equal(result.skipped, 'missing_github_credentials');
});

test('runCiHealthWatchdogCycle: end-to-end sms path with fully injected deps + isolated state file', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-watchdog-test-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    let smsCalled = false;
    const fakeFetch = async (url) => {
      if (String(url).includes('api.github.com')) {
        return {
          ok: true,
          json: async () => ({
            workflow_runs: [{ head_sha: 'newsha', conclusion: 'failure', status: 'completed', html_url: 'https://x', created_at: 'now' }],
          }),
        };
      }
      if (String(url).includes('/founder/sms')) {
        smsCalled = true;
        return { ok: true, json: async () => ({ ok: true }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    // fetchLatestMainRun/sendFounderSms are not individually injectable into
    // runCiHealthWatchdogCycle, so monkeypatch global fetch for this isolated cycle.
    const realFetch = global.fetch;
    global.fetch = fakeFetch;
    try {
      const result = await runCiHealthWatchdogCycle({
        token: 't',
        repo: 'owner/repo',
        baseUrl: 'https://x',
        commandKey: 'k',
        alertPhone: '+15551234567',
        logger: { warn() {}, info() {} },
      });
      assert.equal(result.action, 'sms');
      assert.equal(result.alerted, true);
      assert.equal(smsCalled, true);
    } finally {
      global.fetch = realFetch;
    }

    const persisted = loadState();
    assert.ok(persisted.alertedShas.newsha);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runCiHealthWatchdogCycle: failed alert delivery retains state so the next cycle retries', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-watchdog-retry-'));
  const originalCwd = process.cwd();
  const realFetch = global.fetch;
  process.chdir(tmpDir);
  try {
    let smsAttempts = 0;
    global.fetch = async (url) => {
      if (String(url).includes('api.github.com')) {
        return {
          ok: true,
          json: async () => ({
            workflow_runs: [{ head_sha: 'retrysha', conclusion: 'failure', status: 'completed', html_url: 'https://x', created_at: 'now' }],
          }),
        };
      }
      smsAttempts += 1;
      return smsAttempts === 1
        ? { ok: false, status: 503, json: async () => ({ ok: false }) }
        : { ok: true, status: 200, json: async () => ({ ok: true }) };
    };

    const options = {
      token: 't',
      repo: 'owner/repo',
      baseUrl: 'https://x',
      commandKey: 'k',
      alertPhone: '+15551234567',
      logger: { warn() {}, info() {} },
    };
    const failed = await runCiHealthWatchdogCycle(options);
    assert.equal(failed.alerted, false);
    assert.equal(failed.reason, 'alert_delivery_failed');
    assert.deepEqual(loadState(), { alertedShas: {} });

    const retried = await runCiHealthWatchdogCycle(options);
    assert.equal(retried.alerted, true);
    assert.equal(smsAttempts, 2);
    assert.ok(loadState().alertedShas.retrysha);
  } finally {
    global.fetch = realFetch;
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runCiHealthWatchdogCycle: failed recovery SMS keeps prior alert state', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-watchdog-recovery-'));
  const originalCwd = process.cwd();
  const realFetch = global.fetch;
  process.chdir(tmpDir);
  try {
    saveState({ alertedShas: { oldsha: { smsAt: 1, calledAt: null } } });
    global.fetch = async (url) => {
      if (String(url).includes('api.github.com')) {
        return {
          ok: true,
          json: async () => ({
            workflow_runs: [{ head_sha: 'greensha', conclusion: 'success', status: 'completed', html_url: 'https://x', created_at: 'now' }],
          }),
        };
      }
      return { ok: false, status: 503, json: async () => ({ ok: false }) };
    };

    const result = await runCiHealthWatchdogCycle({
      token: 't',
      repo: 'owner/repo',
      baseUrl: 'https://x',
      commandKey: 'k',
      alertPhone: '+15551234567',
      logger: { warn() {}, info() {} },
    });
    assert.equal(result.action, 'recovered');
    assert.equal(result.alerted, false);
    assert.deepEqual(loadState(), { alertedShas: { oldsha: { smsAt: 1, calledAt: null } } });
  } finally {
    global.fetch = realFetch;
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('loadState/saveState: round-trips through an isolated data dir', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-watchdog-state-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    assert.deepEqual(loadState(), { alertedShas: {} });
    saveState({ alertedShas: { abc: { smsAt: 1, calledAt: null } } });
    assert.deepEqual(loadState(), { alertedShas: { abc: { smsAt: 1, calledAt: null } } });
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
