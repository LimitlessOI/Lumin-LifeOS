/**
 * SYNOPSIS: js — tests/runtime-modes.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { getRuntimeProfile, getRuntimeModeSnapshot } from '../services/runtime-modes.js';

test('Railway runtime is hard-locked to founder_builder even if stale full-runtime flags remain', () => {
  const env = {
    RAILWAY_ENVIRONMENT: 'production',
    LIFEOS_RUNTIME_PROFILE: 'full',
    LIFEOS_ENABLE_FULL_RUNTIME: 'true',
    LIFEOS_ALLOW_FULL_RUNTIME_ON_RAILWAY: 'true',
  };

  assert.equal(getRuntimeProfile(env), 'founder_builder');
  const snap = getRuntimeModeSnapshot(env);
  assert.equal(snap.runtimeProfile, 'founder_builder');
  assert.equal(snap.railwayRuntimeLockedToFounderBuilder, true);
});

test('Local runtime may still opt into full runtime for salvage/forensics', () => {
  const env = {
    LIFEOS_RUNTIME_PROFILE: 'full',
    LIFEOS_ENABLE_FULL_RUNTIME: 'true',
  };

  assert.equal(getRuntimeProfile(env), 'full');
});

test('Default runtime remains founder_builder', () => {
  assert.equal(getRuntimeProfile({}), 'founder_builder');
});
