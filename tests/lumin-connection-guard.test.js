/**
 * SYNOPSIS: Lumin single-connection guard tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLegacyLuminBlockedResponse,
  isLuminSingleConnectionEnforced,
  auditLuminConnectionWiring,
  CANONICAL_FOUNDER_MESSAGE_PATH,
} from '../services/lumin-connection-guard.js';

test('isLuminSingleConnectionEnforced defaults on', () => {
  const prev = process.env.LUMIN_SINGLE_CONNECTION;
  delete process.env.LUMIN_SINGLE_CONNECTION;
  assert.equal(isLuminSingleConnectionEnforced(), true);
  process.env.LUMIN_SINGLE_CONNECTION = '0';
  assert.equal(isLuminSingleConnectionEnforced(), false);
  if (prev === undefined) delete process.env.LUMIN_SINGLE_CONNECTION;
  else process.env.LUMIN_SINGLE_CONNECTION = prev;
});

test('buildLegacyLuminBlockedResponse points to canonical path', () => {
  const body = buildLegacyLuminBlockedResponse('chat_messages');
  assert.equal(body.error, 'LUMIN_LEGACY_PATH_RETIRED');
  assert.equal(body.canonical_path, CANONICAL_FOUNDER_MESSAGE_PATH);
  assert.equal(body.history_only, true);
});

test('auditLuminConnectionWiring passes structural checks', () => {
  const audit = auditLuminConnectionWiring();
  assert.equal(audit.ok, true);
  assert.ok(audit.score >= 10);
});
