/**
 * SYNOPSIS: Direct program answers — SMOS/connection from SSOT, no counsel drift.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldUseDirectProgramAnswer,
  formatDirectProgramAnswer,
  shouldUseDirectFactualAnswer,
} from '../services/chair-program-direct-answer.js';
import { isVisualUiPatchRequest } from '../services/founder-visual-ui-patch.js';

const SMOS_FACTS = {
  lumin_is_chair: true,
  personal_turn: false,
  program_context: [{ id: 'smos', amendment: 'docs/products/marketingos/PRODUCT_HOME.md' }],
  system_knowledge: 'Lumin IS the Chair — SMOS workflow consent → session → coach → extract → generate → approve → export',
  builder_capability: { build_async: true },
};

test('SMOS workflow question uses direct answer', () => {
  const q = 'what does our Social Media OS workflow look like for relocation content?';
  assert.equal(shouldUseDirectProgramAnswer(q, SMOS_FACTS), true);
  const ans = formatDirectProgramAnswer(q, SMOS_FACTS);
  assert.match(ans, /consent|session/i);
  assert.match(ans, /coach/i);
  assert.match(ans, /extract|generate|approve|export/i);
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

test('thread recall question does not short-circuit to factual search', () => {
  const q = 'What exact phrase did I just ask you to remember for this thread?';
  assert.equal(shouldUseDirectFactualAnswer(q, {
    recent_thread: 'Adam: Remember iron-harbor-123456\nLumin: Noted.',
    verified_search: 'Live search unavailable for: What exact phrase did I just ask you to remember for this thread?.',
  }), false);
});
