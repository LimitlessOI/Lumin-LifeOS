/**
 * SYNOPSIS: js — tests/chair-program-direct-answer.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldUseDirectProgramAnswer,
  formatDirectProgramAnswer,
} from '../services/chair-program-direct-answer.js';

test('direct SMOS answer — workflow steps present', () => {
  const facts = {
    personal_turn: false,
    system_knowledge: 'Workflow: content_brief → coach → record',
    program_context: [{ id: 'smos', amendment: 'docs/projects/AMENDMENT_41_MARKETINGOS.md' }],
  };
  assert.equal(shouldUseDirectProgramAnswer('what does our SMOS workflow look like?', facts), true);
  const ans = formatDirectProgramAnswer('SMOS workflow for relocation', facts);
  assert.match(ans, /brief|coach|record|publish/i);
});
