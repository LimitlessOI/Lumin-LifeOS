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
  const hits = detectFormulaViolations('What I heard you say was that it sounds really hard. Thank you for sharing.');
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
  const byId = Object.fromEntries(audit.checks.map((c) => [c.id, c]));
  assert.equal(byId['COMM-WIRE-10']?.ok, true, 'direct agent must enforce Communication Law');
  assert.equal(byId['COMM-WIRE-11']?.ok, true, 'direct agent must carry COMMUNICATION DNA');
});

test('enforceCommunicationLaw does not gut normal sentences containing want', () => {
  const result = enforceCommunicationLaw('What do you want to move next on LifeOS?');
  assert.match(result.text, /want to move/i);
  assert.ok(!/What do to move/i.test(result.text));
});

test('scrub preserves not-a-go-between as system identity', () => {
  const result = enforceCommunicationLaw(
    'I am the system — Lumin. Not a go-between. I see your memory and builds.',
  );
  assert.match(result.text, /I am the system/i);
  assert.ok(!/Not a \./.test(result.text));
  assert.ok(!/go-between/i.test(result.text) || /system/i.test(result.text));
});

test('direct agent identity is the system, not a go-between (module wiring)', async () => {
  const src = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../services/chair-direct-agent.js', import.meta.url), 'utf8'),
  );
  assert.match(src, /You ARE LifeOS\/BuilderOS|THE SYSTEM speaking/i);
  assert.doesNotMatch(src, /You are the translation layer \+ the hands/);
});