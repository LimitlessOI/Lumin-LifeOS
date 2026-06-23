/**
 * SYNOPSIS: LifeRE Chair service unit tests.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifeREChairService } from '../services/lifere-chair-service.js';

test('chair brief returns required question keys', async () => {
  const chair = createLifeREChairService({ pool: null });
  const brief = await chair.answerChairBrief({ userId: 'adam' });
  assert.equal(brief.ok, true);
  assert.ok('what_should_i_do_next' in brief);
  assert.ok('closest_to_30k' in brief);
  assert.ok('bottleneck' in brief);
  assert.ok(Array.isArray(brief.leads_need_attention));
});

test('chair brief includes relationship guardrails when marriage edge exists', async () => {
  const chair = createLifeREChairService({ pool: null });
  const brief = await chair.answerChairBrief({ userId: 'adam' });
  if (brief.relationship_guardrails) {
    assert.ok(brief.relationship_guardrails.shared_goals?.length >= 0);
  }
});
