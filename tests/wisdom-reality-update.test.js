/**
 * SYNOPSIS: Wisdom reality update tests.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { updateLensRegistryFromOutcomes, computeTrustUpdate } from '../services/wisdom-reality-update.mjs';

function makeRegistry() {
  return {
    version: '1',
    lenses: [
      { lens_id: 'steve-jobs', name: 'Steve', trust_score: 0.5, confidence: 0.5, performs_well: [], performs_poorly: [], disagreement_profile: [] },
      { lens_id: 'cfo-roi', name: 'CFO', trust_score: 0.5, confidence: 0.5, performs_well: [], performs_poorly: [], disagreement_profile: [] },
    ],
  };
}

describe('wisdom-reality-update', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'wisdom-')); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('increases trust on pass and decreases on fail', () => {
    const registryPath = join(tmpDir, 'lenses.json');
    const registry = makeRegistry();
    writeFileSync(registryPath, JSON.stringify(registry));
    const result = updateLensRegistryFromOutcomes({
      outcomes: [
        { lens_id: 'steve-jobs', model: 'claude_sonnet', outcome: 'pass', source: 'sentry-reality-station' },
        { lens_id: 'cfo-roi', model: 'openai_gpt', outcome: 'fail', source: 'sentry-reality-station' },
      ],
      registryPath,
    });
    const steve = result.registry.lenses.find((l) => l.lens_id === 'steve-jobs');
    const cfo = result.registry.lenses.find((l) => l.lens_id === 'cfo-roi');
    assert.ok(steve.trust_score > 0.5);
    assert.ok(cfo.trust_score < 0.5);
    assert.ok(steve.performs_well.includes('claude_sonnet'));
    assert.ok(cfo.performs_poorly.includes('openai_gpt'));
  });

  it('dry-run does not write the registry', () => {
    const registryPath = join(tmpDir, 'lenses.json');
    writeFileSync(registryPath, JSON.stringify(makeRegistry()));
    const before = readFileSync(registryPath, 'utf8');
    updateLensRegistryFromOutcomes({
      outcomes: [{ lens_id: 'steve-jobs', model: 'claude_sonnet', outcome: 'pass' }],
      registryPath,
      dryRun: true,
    });
    assert.equal(readFileSync(registryPath, 'utf8'), before);
  });

  it('computeTrustUpdate clamps between 0 and 1', () => {
    assert.equal(computeTrustUpdate(0.98, 'pass'), 1);
    assert.equal(computeTrustUpdate(0.02, 'fail'), 0);
  });
});
