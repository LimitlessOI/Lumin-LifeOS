/**
 * SYNOPSIS: TALOA-A2Z-004 -- post-action result verification. A click/type/
 * send is never success by itself: compares the pre-action observation, the
 * intended acceptance condition, and a fresh post-action observation before
 * calling anything VERIFIED. Matches the standing rule that an action's
 * execution and its actual effect are separate truths.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const MAX_BOUNDED_RETRIES = 2;

function stateChanged(before, after) {
  if (!before || !after) return false;
  if (before.evidence?.url !== after.evidence?.url) return true;
  if (before.generating !== after.generating) return true;
  if ((before.controls?.length || 0) !== (after.controls?.length || 0)) return true;
  if (before.composer?.text !== after.composer?.text) return true;
  return false;
}

function acceptanceMet(after, acceptance) {
  if (!acceptance) return stateChanged(null, after) || true; // no explicit condition: presence of a fresh observation is the floor
  if (acceptance.expectUrlContains && !String(after?.evidence?.url || '').includes(acceptance.expectUrlContains)) return false;
  if (acceptance.expectTextContains && !String(after?.evidence?.title || '').concat(' ', JSON.stringify(after?.controls || [])).includes(acceptance.expectTextContains)) return false;
  if (acceptance.expectComposerCleared && after?.composer?.text) return false;
  if (acceptance.expectNotGenerating && after?.generating) return false;
  return true;
}

export function createOverlayResultVerifier() {
  function verify({ before, plan, after, acceptance, attemptCount = 1 } = {}) {
    if (!after) {
      return { status: 'HARD_CAPABILITY_BLOCKER', reason: 'no_post_action_observation', evidence: { plan } };
    }

    if (!stateChanged(before, after) && plan?.type !== 'wait') {
      if (attemptCount < MAX_BOUNDED_RETRIES) {
        return { status: 'RETRY_BOUNDED', reason: 'no_observable_state_change', evidence: { before, after }, attempt: attemptCount };
      }
      return { status: 'FALLBACK_REQUIRED', reason: 'state_unchanged_after_bounded_retries', evidence: { before, after } };
    }

    if (!acceptanceMet(after, acceptance)) {
      if (attemptCount < MAX_BOUNDED_RETRIES) {
        return { status: 'RETRY_BOUNDED', reason: 'acceptance_condition_not_met', evidence: { after, acceptance }, attempt: attemptCount };
      }
      return { status: 'FALLBACK_REQUIRED', reason: 'acceptance_condition_not_met_after_retries', evidence: { after, acceptance } };
    }

    return {
      status: 'VERIFIED',
      evidence: { before_url: before?.evidence?.url || null, after_url: after?.evidence?.url || null, verified_at: new Date().toISOString() },
    };
  }

  return { verify };
}

export default { createOverlayResultVerifier };
