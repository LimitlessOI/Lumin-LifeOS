/**
 * SYNOPSIS: js — tests/chair-system-knowledge.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gatherChairSystemKnowledge,
  needsSystemKnowledge,
  searchRepoSynopsis,
} from '../services/chair-system-knowledge.js';

test('needsSystemKnowledge — SMOS question', () => {
  assert.equal(needsSystemKnowledge('what does our Social Media OS workflow look like?'), true);
});

test('searchRepoSynopsis — finds smos bridge', () => {
  const hits = searchRepoSynopsis('socialmediaos content brief', { limit: 5 });
  assert.ok(hits.some((h) => /socialmediaos|content-brief/i.test(h.path)));
});

test('gatherChairSystemKnowledge — SMOS workflow in formatted block', async () => {
  const know = await gatherChairSystemKnowledge('explain our SMOS workflow for relocation content');
  assert.ok(know.programs.some((p) => p.id === 'smos'));
  assert.match(know.formatted, /consent|session|coach|extract|generate|approve|export/i);
});
