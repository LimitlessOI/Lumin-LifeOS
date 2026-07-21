/**
 * SYNOPSIS: SO-003 regression — the Chair must route every reply through a real
 * model (translatePersonality), never a hardcoded template. Guards against the
 * chair-lumin-unified short-circuit where formatDirectProgramAnswer/…Factual BE
 * the reply with zero model call. Fails against the pre-fix code.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runChairNativeTurn,
  resolveGroundedDirectAnswer,
} from '../services/chair-lumin-unified.js';

const SMOS_INPUT = 'How does the SMOS workflow work?';
const smosFacts = () => ({
  program_context: [{ id: 'smos' }],
  system_knowledge: 'SMOS is the Social Media OS content workflow.',
  chair_note: '',
  personal_turn: false,
});

test('resolveGroundedDirectAnswer returns a verified block for a program ask (grounding present)', () => {
  const grounded = resolveGroundedDirectAnswer(SMOS_INPUT, smosFacts());
  assert.ok(grounded, 'expected a grounded direct answer for the SMOS workflow ask');
  assert.match(grounded, /Social Media OS/i);
});

test('SO-003: a program/factual ask still reaches the model — never a canned short-circuit', async () => {
  let modelCalls = 0;
  let seenFacts = null;

  const result = await runChairNativeTurn(
    SMOS_INPUT,
    {
      callAI: async () => '',
      // Inject controlled facts so we do not hit DB/web-search integrations.
      gatherFacts: async () => smosFacts(),
      // Spy standing in for the real strong-model translation path.
      translatePersonality: async ({ systemFacts }) => {
        modelCalls += 1;
        seenFacts = systemFacts;
        return 'MODEL_PRODUCED_REPLY';
      },
    },
    { domain: 'chair', account_role: 'founder' },
  );

  // Pre-fix code assigned voice = formatDirectProgramAnswer(...) and NEVER called
  // translatePersonality for this input → modelCalls would be 0 and this fails.
  assert.equal(modelCalls, 1, 'translatePersonality (the model) must run exactly once');
  assert.equal(result.human_summary_technical, 'MODEL_PRODUCED_REPLY');
  assert.ok(seenFacts, 'model must receive systemFacts');
  assert.ok(
    seenFacts.grounded_direct_answer && /Social Media OS/i.test(seenFacts.grounded_direct_answer),
    'the verified block must be passed to the model as grounded_direct_answer, not returned as the reply',
  );
});