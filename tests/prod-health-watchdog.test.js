/**
 * SYNOPSIS: js — tests/prod-health-watchdog.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateProdHealth, evaluateEscalation, collectiblesPrintClosedFinding } from '../scripts/prod-health-watchdog.mjs';
import { evaluateSystemWatchdog } from '../scripts/lib/system-watchdog.mjs';

const healthy = { httpOk: true, body: { startup: { startup_report: { reasons: [] } } } };
const degraded = { httpOk: true, body: { startup: { startup_report: { reasons: ['migrations_failed:2'] } } } };
const unreachable = { httpOk: false, body: null };

test('evaluateProdHealth: healthy with no prior alert takes no action', () => {
  const { action, newState } = evaluateProdHealth({ health: healthy, state: {}, now: 1000 });
  assert.equal(action, 'none');
  assert.equal(newState.alertedReasons ?? null, null);
});

test('evaluateProdHealth: degraded appearing for the first time sends sms', () => {
  const { action, reasonKey, newState } = evaluateProdHealth({ health: degraded, state: {}, now: 2000 });
  assert.equal(action, 'sms');
  assert.equal(reasonKey, 'migrations_failed:2');
  assert.equal(newState.alertedReasons.reasonKey, 'migrations_failed:2');
  assert.equal(newState.alertedReasons.smsAt, 2000);
  assert.equal(newState.alertedReasons.calledAt, null);
});

test('evaluateProdHealth: still degraded shortly after sms takes no action (too soon to call)', () => {
  const state = { alertedReasons: { reasonKey: 'migrations_failed:2', smsAt: 2000, calledAt: null } };
  const { action } = evaluateProdHealth({ health: degraded, state, now: 3000 });
  assert.equal(action, 'none');
});

test('evaluateProdHealth: still degraded past the call-escalation delay places a call', () => {
  const state = { alertedReasons: { reasonKey: 'migrations_failed:2', smsAt: 2000, calledAt: null } };
  const { action, newState } = evaluateProdHealth({ health: degraded, state, now: 2000 + 11 * 60 * 1000 });
  assert.equal(action, 'call');
  assert.ok(newState.alertedReasons.calledAt);
});

test('evaluateProdHealth: already called for this reason takes no further action', () => {
  const state = { alertedReasons: { reasonKey: 'migrations_failed:2', smsAt: 2000, calledAt: 700000 } };
  const { action } = evaluateProdHealth({ health: degraded, state, now: 2000 + 20 * 60 * 1000 });
  assert.equal(action, 'none');
});

test('evaluateProdHealth: recovery after an alert sends a recovery sms and clears state', () => {
  const state = { alertedReasons: { reasonKey: 'migrations_failed:2', smsAt: 2000, calledAt: null } };
  const { action, newState } = evaluateProdHealth({ health: healthy, state, now: 999999 });
  assert.equal(action, 'recovered');
  assert.equal(newState.alertedReasons, null);
});

test('evaluateProdHealth: unreachable server is treated as its own alertable reason', () => {
  const { action, reasonKey } = evaluateProdHealth({ health: unreachable, state: {}, now: 1000 });
  assert.equal(action, 'sms');
  assert.equal(reasonKey, 'unreachable');
});

test('evaluateProdHealth: a new degraded reason after recovery re-alerts instead of being suppressed', () => {
  let state = {};
  ({ newState: state } = evaluateProdHealth({ health: degraded, state, now: 1 }));
  const differentReason = { httpOk: true, body: { startup: { startup_report: { reasons: ['db_connection_lost'] } } } };
  const { action, reasonKey } = evaluateProdHealth({ health: differentReason, state, now: 2 });
  assert.equal(action, 'sms');
  assert.equal(reasonKey, 'db_connection_lost');
});

test('evaluateProdHealth: reasons list order does not create a false distinct-incident re-alert', () => {
  let state = {};
  ({ newState: state } = evaluateProdHealth({
    health: { httpOk: true, body: { startup: { startup_report: { reasons: ['a', 'b'] } } } },
    state,
    now: 1,
  }));
  const { action } = evaluateProdHealth({
    health: { httpOk: true, body: { startup: { startup_report: { reasons: ['b', 'a'] } } } },
    state,
    now: 2,
  });
  assert.equal(action, 'none');
});

test('system watchdog is quiet when governed is ticking and Taloa is up', () => {
  const { ok, findings } = evaluateSystemWatchdog({
    now: 10_000,
    governed: { enabled: true, lastTickAt: new Date(9_000).toISOString(), hardHalt: false },
    factory2: { tickAt: new Date(9_000).toISOString(), taloaRunning: true },
  });
  assert.equal(ok, true);
  assert.equal(findings.length, 0);
});

test('system watchdog names a playbook when factory-1 false-blocks native overlay', () => {
  const { ok, findings, reasonKey } = evaluateSystemWatchdog({
    overlayNativeBlocks: [{
      id: 'TALOA-BADGE-VOICE-001',
      status: 'blocked',
      last_error: 'NOT_ON_BLUEPRINT',
      target_file: 'native/macos-overlay/ContainerView.swift',
    }],
  });
  assert.equal(ok, false);
  assert.equal(reasonKey, 'false_block:TALOA-BADGE-VOICE-001');
  assert.match(findings[0].proposed_solution, /factory-2 native/);
});

test('system watchdog flags a stale governed loop', () => {
  const now = 20 * 60 * 1000;
  const { ok, findings } = evaluateSystemWatchdog({
    now,
    governed: { enabled: true, lastTickAt: new Date(0).toISOString() },
  });
  assert.equal(ok, false);
  assert.equal(findings[0].id, 'governed_loop_stale');
});

test('evaluateEscalation: a stopped-build finding escalates to a call after the delay, same as health', () => {
  const first = evaluateEscalation({ reasonKey: 'queue_ship_thrash:X', alerted: null, now: 2000 });
  assert.equal(first.action, 'sms');
  const stillWithin = evaluateEscalation({ reasonKey: 'queue_ship_thrash:X', alerted: first.newAlerted, now: 3000 });
  assert.equal(stillWithin.action, 'none');
  const pastDelay = evaluateEscalation({ reasonKey: 'queue_ship_thrash:X', alerted: first.newAlerted, now: 2000 + 11 * 60 * 1000 });
  assert.equal(pastDelay.action, 'call');
  assert.ok(pastDelay.newAlerted.calledAt);
});

test('collectiblesPrintClosedFinding: does not fire when the product has not started yet', () => {
  const queue = { steps: [
    { id: 'COLLECTIBLES-V1-A', target_file: 'services/collectibles/a.js', status: 'pending' },
  ] };
  assert.equal(collectiblesPrintClosedFinding(queue), null);
});

test('collectiblesPrintClosedFinding: does not fire while real work is still pending', () => {
  const queue = { steps: [
    { id: 'COLLECTIBLES-V1-A', target_file: 'services/collectibles/a.js', status: 'done' },
    { id: 'COLLECTIBLES-V1-B', target_file: 'services/collectibles/b.js', status: 'pending' },
  ] };
  assert.equal(collectiblesPrintClosedFinding(queue), null);
});
