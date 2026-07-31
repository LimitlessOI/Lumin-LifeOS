/**
 * SYNOPSIS: Tests for the BuilderOS Cognitive Chair.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadLensRegistry,
  loadLens,
  listLenses,
  resolveResponsibilities,
  selectLensesForResponsibility,
  selectModelMemberForLens,
  buildLensPrompt,
  buildChairSynthesisPrompt,
  composeReasoning,
} from '../services/cognitive-chair.mjs';

describe('cognitive-chair', () => {
  it('loads the lens registry with sample lenses', () => {
    const registry = loadLensRegistry();
    assert.ok(registry.lenses.length >= 6, 'registry should contain at least the six canonical lenses');
    const ids = new Set(registry.lenses.map((l) => l.lens_id));
    assert.ok(ids.has('steve-jobs'));
    assert.ok(ids.has('cfo-roi'));
    assert.ok(ids.has('customer-ease'));
  });

  it('loads an individual lens', () => {
    const lens = loadLens('steve-jobs');
    assert.equal(lens.lens_id, 'steve-jobs');
    assert.ok(lens.philosophy);
    assert.ok(Array.isArray(lens.strengths));
    assert.ok(typeof lens.confidence === 'number');
  });

  it('lists lenses', () => {
    const lenses = listLenses();
    assert.ok(lenses.some((l) => l.lens_id === 'toyota-lean'));
  });

  it('resolves responsibilities with default fallback', () => {
    assert.deepEqual(resolveResponsibilities([]), ['chair']);
    assert.deepEqual(resolveResponsibilities(['chair', 'cfo']), ['chair', 'cfo']);
  });

  it('selects lenses by responsibility', () => {
    const registry = loadLensRegistry();
    const chairLenses = selectLensesForResponsibility('chair', [], registry);
    assert.ok(chairLenses.some((l) => l.lens_id === 'steve-jobs'));

    const cfoLenses = selectLensesForResponsibility('cfo', [], registry);
    assert.ok(cfoLenses.some((l) => l.lens_id === 'cfo-roi'));
  });

  it('honors requested lens ids', () => {
    const registry = loadLensRegistry();
    const selected = selectLensesForResponsibility('chair', ['wisdom-memory'], registry);
    assert.equal(selected[0].lens_id, 'wisdom-memory');
  });

  it('selects a model member for a lens', () => {
    const lens = loadLens('cfo-roi');
    const member = selectModelMemberForLens(lens, 'cfo');
    assert.equal(member, 'openai_gpt');
  });

  it('builds a lens prompt containing mission and lens philosophy', () => {
    const lens = loadLens('customer-ease');
    const prompt = buildLensPrompt({ lens, responsibility: 'sentry', mission: 'Should we simplify onboarding?' });
    assert.ok(prompt.includes('Customer Ease Lens'));
    assert.ok(prompt.includes('Should we simplify onboarding?'));
    assert.ok(prompt.includes('"summary"'));
  });

  it('builds a chair synthesis prompt from outputs', () => {
    const outputs = [
      { responsibility: 'cfo', lens_id: 'cfo-roi', summary: 'Too expensive', position: 'Cut costs', evidence: ['burn'], disagreements: ['steve-jobs'], confidence: 0.9, recommended_action: 'Defer' },
      { responsibility: 'chair', lens_id: 'steve-jobs', summary: 'Simplify', position: 'Remove features', evidence: ['clarity'], disagreements: ['cfo-roi'], confidence: 0.85, recommended_action: 'Ship' },
    ];
    const prompt = buildChairSynthesisPrompt({ mission: 'Should we simplify onboarding?', outputs });
    assert.ok(prompt.includes('CHAIR'));
    assert.ok(prompt.includes('Too expensive'));
    assert.ok(prompt.includes('cfo-roi'));
  });

  it('enforces Knowledge and Judgment separation in lens prompts', () => {
    const lens = loadLens('customer-ease');
    const prompt = buildLensPrompt({ lens, responsibility: 'chair', mission: 'Should we simplify onboarding?' });
    assert.ok(prompt.includes('Keep Knowledge and Judgment separate'), 'prompt names the separation');
    assert.ok(prompt.includes('"knowledge"'), 'prompt asks for knowledge list');
    assert.ok(prompt.includes('"judgment"'), 'prompt asks for judgment paragraph');
    assert.ok(prompt.includes('Prior lens judgments (NOT facts)'), 'prior outputs are labeled as other-judgments');
  });

  it('requires propagated confidence, unknowns, assumptions, and evidence_needed in chair synthesis', () => {
    const outputs = [
      { responsibility: 'cfo', lens_id: 'cfo-roi', summary: 'Too expensive', position: 'Cut costs', evidence: ['burn'], disagreements: ['steve-jobs'], confidence: 0.9, recommended_action: 'Defer' },
      { responsibility: 'chair', lens_id: 'steve-jobs', summary: 'Simplify', position: 'Remove features', evidence: ['clarity'], disagreements: ['cfo-roi'], confidence: 0.85, recommended_action: 'Ship' },
    ];
    const prompt = buildChairSynthesisPrompt({ mission: 'Should we simplify onboarding?', outputs });
    assert.ok(prompt.includes('propagated_confidence'));
    assert.ok(prompt.includes('limiting_factor'));
    assert.ok(prompt.includes('unknowns'));
    assert.ok(prompt.includes('assumptions'));
    assert.ok(prompt.includes('evidence_needed'));
  });

  it('composes a dry-run reasoning transcript', async () => {
    const transcript = await composeReasoning({
      mission: 'Should we remove half the onboarding steps?',
      responsibilities: ['chair', 'cfo'],
      lenses: ['steve-jobs', 'cfo-roi'],
    });

    assert.equal(transcript.dry_run, true);
    assert.equal(transcript.mission, 'Should we remove half the onboarding steps?');
    assert.ok(transcript.outputs.length > 0);
    assert.ok(transcript.outputs.every((o) => o.prompt && o.model_member));
    assert.ok(transcript.outputs.some((o) => o.lens_id === 'steve-jobs'));
    assert.ok(transcript.outputs.some((o) => o.lens_id === 'cfo-roi'));
    assert.ok(transcript.chair?.prompt);
    assert.ok(transcript.chair?.prompt.includes('CHAIR'));
  });

  it('composes with execute mode using a fake callModel', async () => {
    const fakeCallModel = async ({ member, prompt }) => ({
      content: JSON.stringify({
        lens_id: 'steve-jobs',
        responsibility: 'chair',
        summary: 'Simplify',
        position: 'Remove features',
        confidence: 0.9,
        evidence: ['clarity'],
        disagreements: ['cfo-roi'],
        recommended_action: 'Ship',
      }),
      member,
      usage: { total_tokens: 50, estimated_usd: 0 },
    });

    const transcript = await composeReasoning({
      mission: 'Should we simplify?',
      responsibilities: ['chair'],
      lenses: ['steve-jobs'],
      callModel: fakeCallModel,
    });

    assert.equal(transcript.dry_run, false);
    assert.equal(transcript.model_calls_used, 2); // one lens + chair synthesis
    assert.equal(transcript.outputs[0].parsed.summary, 'Simplify');
  });
});
