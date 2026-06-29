/**
 * SYNOPSIS: AI prose truth envelope tests.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAiProseTruthEnvelope,
  shouldSkipTruthEnvelope,
} from '../services/ai-prose-truth-envelope.js';

describe('ai-prose-truth-envelope', () => {
  it('scrubs execution theater on counsel default', () => {
    const { text, envelope } = applyAiProseTruthEnvelope(
      'LifeOS is now open. What would you like to do first?',
      { command_truth: 'NO_COMMAND_RAN', taskType: 'chat' },
    );
    assert.equal(envelope.theater_blocked, true);
    assert.doesNotMatch(text, /LifeOS is now open/i);
  });

  it('skips codegen tasks', () => {
    assert.equal(shouldSkipTruthEnvelope({}, 'council.builder.code'), true);
    const { envelope } = applyAiProseTruthEnvelope('export function foo() {}', { taskType: 'council.builder.code' });
    assert.equal(envelope.skipped, true);
  });

  it('blocks voice-rail background work lies without counsel-only boilerplate', () => {
    const { text, envelope } = applyAiProseTruthEnvelope(
      'I am still actively working on the blueprint alignment and will report back when complete.',
      { command_truth: 'NO_COMMAND_RAN', taskType: 'voice_rail_department' },
    );
    assert.equal(envelope.voice_lie_blocked, true);
    assert.doesNotMatch(text, /Counsel only|sync chat/i);
    assert.doesNotMatch(text, /actively working on the blueprint/i);
  });

  it('scrubs false verification without command', () => {
    const { text } = applyAiProseTruthEnvelope(
      'I verified that your deploy is live on production.',
      { command_truth: 'NO_COMMAND_RAN', taskType: 'chat' },
    );
    assert.doesNotMatch(text, /I verified that/i);
  });

  it('preserves honest counsel', () => {
    const { text, envelope } = applyAiProseTruthEnvelope(
      'Oil changes every 5k miles — check your manual.',
      { command_truth: 'NO_COMMAND_RAN', taskType: 'chat' },
    );
    assert.equal(envelope.theater_blocked, false);
    assert.match(text, /Oil changes every 5k miles/);
  });
});
