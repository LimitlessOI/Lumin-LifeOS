/**
 * SYNOPSIS: Direct program answers — SMOS/connection from SSOT, no counsel drift.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseDirectProgramAnswer, formatDirectProgramAnswer } from '../services/chair-program-direct-answer.js';
import { isVisualUiPatchRequest } from '../services/founder-visual-ui-patch.js';

const SMOS_FACTS = {
  lumin_is_chair: true,
  personal_turn: false,
  program_context: [{ id: 'smos', amendment: 'docs/projects/AMENDMENT_41_MARKETINGOS.md' }],
  system_knowledge: 'Lumin IS the Chair — SMOS workflow brief → coach → record → post → publish',
  builder_capability: { build_async: true },
};

test('SMOS workflow question uses direct answer', () => {
  const q = 'what does our Social Media OS workflow look like for relocation content?';
  assert.equal(shouldUseDirectProgramAnswer(q, SMOS_FACTS), true);
  const ans = formatDirectProgramAnswer(q, SMOS_FACTS);
  assert.match(ans, /brief/i);
  assert.match(ans, /coach/i);
  assert.match(ans, /publish/i);
  assert.match(ans, /relocation/i);
});

test('connection question uses direct answer', () => {
  const q = 'are you connected to the LifeOS system APIs right now?';
  assert.equal(shouldUseDirectProgramAnswer(q, { lumin_is_chair: true, builder_capability: {} }), true);
  const ans = formatDirectProgramAnswer(q, { lumin_is_chair: true });
  assert.match(ans, /same system/i);
  assert.match(ans, /founder-interface\/message/i);
});

test('counsel-only builder explain does not false-trigger build request path', async () => {
  const { isBuildRequest, isCounselOnlyBypass } = await import('../services/chair-intent-signals.js');
  const { resolveChairContext } = await import('../services/chair-context-classifier.js');
  const q = 'explain how you as Lumin the chair implement a lifeos-app change through BuilderOS — counsel only, do not run a build';
  assert.equal(isBuildRequest(q), false);
  assert.equal(isCounselOnlyBypass(q), true);
  assert.equal(resolveChairContext(q).channel, 'chair');
  assert.equal(shouldUseDirectProgramAnswer(q, {
    lumin_is_chair: true,
    builder_capability: { build_async: true },
    program_context: [{ id: 'lumin_chair' }],
    system_knowledge: 'Lumin IS the Chair',
  }), true);
  assert.match(formatDirectProgramAnswer(q, {
    builder_capability: { build_async: true },
    program_context: [{ id: 'lumin_chair' }],
  }), /build_async|BuilderOS/i);
});

test('rounded send button is visual UI patch', () => {
  assert.equal(isVisualUiPatchRequest('make the send button in the lumin drawer slightly more rounded'), true);
});
