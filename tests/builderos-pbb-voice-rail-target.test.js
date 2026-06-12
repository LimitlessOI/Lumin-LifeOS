/**
 * Regression: PBB must resolve target_file from instruction when metadata omits it.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { generatePbbPlanFromOilAudit } from '../services/builderos-pbb-plan.js';
import {
  extractTargetFileFromInstruction,
  inferBuilderDomainForTargetFile,
  looksLikeBuilderProseRefusal,
} from '../services/builder-instruction-target.js';

const VOICE_RAIL_INSTRUCTION =
  'Please build: add a one-line comment "# voice-rail proof" at line 2 of scripts/run-voice-rail-capability-proof.mjs. Do not change anything else.';

describe('builder-instruction-target', () => {
  it('extracts scripts path from voice-rail-style instruction', () => {
    assert.equal(
      extractTargetFileFromInstruction(VOICE_RAIL_INSTRUCTION),
      'scripts/run-voice-rail-capability-proof.mjs',
    );
  });

  it('maps LifeOS scripts to lifeos-platform domain', () => {
    assert.equal(
      inferBuilderDomainForTargetFile('scripts/run-voice-rail-capability-proof.mjs'),
      'lifeos-platform',
    );
  });

  it('detects prose refusal output', () => {
    assert.equal(
      looksLikeBuilderProseRefusal(
        'The content of scripts/run-voice-rail-capability-proof.mjs was not provided.',
        'scripts/run-voice-rail-capability-proof.mjs',
      ),
      true,
    );
    assert.equal(
      looksLikeBuilderProseRefusal('export const x = 1;\n', 'scripts/foo.mjs'),
      false,
    );
  });
});

describe('builderos-pbb-plan voice-rail patch target', () => {
  it('plans patch job with target_file, files[], and lifeos domain without metadata', () => {
    const job = {
      id: 'voice-rail-test-job',
      instruction: VOICE_RAIL_INSTRUCTION,
      metadata_json: {},
    };
    const plan = generatePbbPlanFromOilAudit(job, { ok: true, findings: [] });
    assert.equal(plan.ok, true);
    assert.equal(plan.target_file, 'scripts/run-voice-rail-capability-proof.mjs');
    assert.equal(plan.domain, 'lifeos-platform');
    assert.equal(plan.patch_mode, true);
    assert.deepEqual(plan.files, ['scripts/run-voice-rail-capability-proof.mjs']);
    assert.match(plan.spec, /PATCH MODE/);
    assert.match(plan.spec, /run-voice-rail-capability-proof\.mjs/);
    if (existsSync('scripts/run-voice-rail-capability-proof.mjs')) {
      assert.match(plan.spec, /Voice Rail capability proof/);
    }
  });
});
