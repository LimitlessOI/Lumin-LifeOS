/**
 * SYNOPSIS: Lumin Communication Law — anti-formula + wiring audit tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditLuminCommunicationWiring,
  detectFormulaViolations,
  enforceCommunicationLaw,
  isLuminCommunicationLawEnforced,
} from '../services/lumin-communication-guard.js';

test('isLuminCommunicationLawEnforced defaults on', () => {
  const prev = process.env.LUMIN_COMMUNICATION_LAW;
  delete process.env.LUMIN_COMMUNICATION_LAW;
  assert.equal(isLuminCommunicationLawEnforced(), true);
  process.env.LUMIN_COMMUNICATION_LAW = '0';
  assert.equal(isLuminCommunicationLawEnforced(), false);
  if (prev === undefined) delete process.env.LUMIN_COMMUNICATION_LAW;
  else process.env.LUMIN_COMMUNICATION_LAW = prev;
});

test('detectFormulaViolations catches ChatGPT boilerplate', () => {
  const hits = detectFormulaViolations("Great question! I'm happy to help with that.");
  assert.ok(hits.length >= 2);
});

test('enforceCommunicationLaw scrubs forbidden phrases', () => {
  const result = enforceCommunicationLaw("Absolutely! Here's the thing: your oil change is due.");
  assert.ok(result.text.length > 0);
  assert.equal(detectFormulaViolations(result.text).length, 0);
  assert.equal(result.receipt.schema, 'lumin_communication_law_receipt_v1');
});

test('auditLuminCommunicationWiring passes structural checks', () => {
  const audit = auditLuminCommunicationWiring();
  assert.equal(audit.ok, true);
  assert.ok(audit.score >= 8);
});
