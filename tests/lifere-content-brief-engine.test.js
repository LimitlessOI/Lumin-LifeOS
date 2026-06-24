/**
 * SYNOPSIS: js — tests/lifere-content-brief-engine.test.js.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLifeREContentBriefEngine } from '../services/lifere-content-brief-engine.js';
import { createLifeREMarketingModule } from '../services/lifere-marketing-module.js';

describe('lifere content brief engine', () => {
  it('generateBrief returns draft with persona and gaps', async () => {
    const marketing = createLifeREMarketingModule({ pool: null });
    const engine = createLifeREContentBriefEngine({ pool: null, marketing });
    const res = await engine.generateBrief({
      userId: 'adam',
      topic: 'Vegas relocation costs',
      persona: { label: 'Midwest relocator' },
    });
    assert.equal(res.ok, true);
    assert.ok(res.brief_id);
    assert.equal(res.status, 'draft');
    assert.ok(res.brief.content_gaps?.length);
    assert.equal(res.brief.workflow_gate, 'approve_before_coach_script_record');
  });

  it('assertApprovedBrief blocks until approved', async () => {
    const engine = createLifeREContentBriefEngine({ pool: null });
    const gen = await engine.generateBrief({ userId: 'adam', topic: 'Test topic' });
    const blocked = await engine.assertApprovedBrief({ userId: 'adam', briefId: gen.brief_id });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, 'content_brief_not_approved');

    await engine.approveBrief({ userId: 'adam', briefId: gen.brief_id });
    const allowed = await engine.assertApprovedBrief({ userId: 'adam', briefId: gen.brief_id });
    assert.equal(allowed.ok, true);
  });

  it('formatBriefForPrompt includes topic and persona', async () => {
    const engine = createLifeREContentBriefEngine({ pool: null });
    const gen = await engine.generateBrief({ userId: 'adam', topic: 'HOA red flags' });
    await engine.approveBrief({ userId: 'adam', briefId: gen.brief_id });
    const brief = await engine.getBriefById({ userId: 'adam', briefId: gen.brief_id });
    const text = engine.formatBriefForPrompt(brief);
    assert.match(text, /HOA red flags/);
    assert.match(text, /APPROVED CONTENT BRIEF/);
  });
});
