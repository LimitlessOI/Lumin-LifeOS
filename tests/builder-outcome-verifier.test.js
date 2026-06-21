/**
 * SYNOPSIS: Regression: wrong commit content cannot pass requested-outcome verification.
 * Regression: wrong commit content cannot pass requested-outcome verification.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyGovernedOutcomeBeforePass, __private__ } from '../services/builder-outcome-verifier.js';

describe('builder-outcome-verifier requirement parsing', () => {
  it('extracts quoted required outcome from founder instruction', () => {
    const parsed = __private__.chooseRequiredOutcome(
      'Please implement "Multi-Lane Execution Governance" and nothing else.',
      {},
    );
    assert.equal(parsed.source, 'instruction.quote');
    assert.equal(parsed.text, 'Multi-Lane Execution Governance');
  });
});

describe('builder-outcome-verifier wrong-outcome guard', () => {
  it('returns FAIL_WRONG_OUTCOME when commit content misses requested outcome', async () => {
    const result = await verifyGovernedOutcomeBeforePass({
      job: {
        instruction: 'Requested amendment: "Multi-Lane Execution Governance".',
        metadata_json: {},
      },
      trace: {
        builder_output: {
          commit_sha: 'f2555dfeee6a775063aea39db65f6facfd3868f9',
        },
      },
      verifierResult: { ok: true },
      readCommit: async () => ({
        ok: true,
        commit_sha: 'f2555dfeee6a775063aea39db65f6facfd3868f9',
        commit_message: 'GAP-FILL: builder patch pipeline, §2.18 law, BP CI guard, Voice Rail v2.19',
        changed_files: ['docs/SSOT_NORTH_STAR.md', 'docs/CONTINUITY_LOG.md'],
        patch_text: '### 2.18 Compound Drift Law — Zero Tolerated Angular Error',
      }),
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'FAIL_WRONG_OUTCOME');
    assert.equal(result.reason, 'requested_outcome_missing_in_commit');
  });

  it('passes when committed content includes the required outcome phrase', async () => {
    const result = await verifyGovernedOutcomeBeforePass({
      job: {
        instruction: 'Requested amendment: "Multi-Lane Execution Governance".',
        metadata_json: {},
      },
      trace: {
        builder_output: {
          commit_sha: 'abc123',
        },
      },
      verifierResult: { ok: true },
      readCommit: async () => ({
        ok: true,
        commit_sha: 'abc123',
        commit_message: 'Add Multi-Lane Execution Governance section',
        changed_files: ['docs/SSOT_NORTH_STAR.md'],
        patch_text: '### Multi-Lane Execution Governance',
      }),
    });
    assert.equal(result.ok, true);
    assert.equal(result.code, 'PASS_OUTCOME_VERIFIED');
  });
});
