import { test } from 'node:test';
import assert from 'node:assert';
import { emailMatches } from '../services/tc-email-document-service.js';

test('emailMatches: address tokens AND + any-of repair/inspection wording', () => {
  const search = {
    subject_tokens: ['6453', 'mahogany'],
    subject_any_contains: ['repair', 'repairs', 'inspection', 'response', 'request'],
  };
  assert.strictEqual(
    emailMatches({ subject: '6453 Mahogany Peak — Buyer response to repairs' }, search),
    true
  );
  assert.strictEqual(
    emailMatches({ subject: 'RE: 6453 Mahogany - Inspection report attached' }, search),
    true
  );
  assert.strictEqual(
    emailMatches({ subject: '6453 Mahogany Peak — listing photos' }, search),
    false
  );
});

test('emailMatches: legacy subject_contains splits into token AND', () => {
  assert.strictEqual(
    emailMatches({ subject: '6453 Mahogany repair list' }, { subject_contains: '6453 mahogany' }),
    true
  );
  assert.strictEqual(
    emailMatches({ subject: '6453 Pine repair list' }, { subject_contains: '6453 mahogany' }),
    false
  );
});
