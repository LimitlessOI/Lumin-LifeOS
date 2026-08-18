/**
 * SYNOPSIS: TALOA-A2Z-002 -- deterministic target selection over an
 * observation's actionable candidates. Never returns a target without
 * evidence and a confidence score; returns a typed LOW_CONFIDENCE blocker
 * instead of guessing when nothing meets the bar.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const MIN_CONFIDENCE = 0.5;

// Historical/stale candidates (e.g. an "Allow once" from a resolved earlier
// turn still sitting in the DOM) are the exact failure class the founder hit
// live tonight -- multiple simultaneous approval cards, wrong one clicked.
// Prefer the bottom-most / most-recently-observed candidate as the current
// turn's frontier unless intent names a specific selector or label.
function rankCandidates(actionable, intent) {
  const wantLabel = String(intent?.label || '').toLowerCase();
  const wantKind = intent?.kind || null;
  const wantSelector = intent?.selector || null;

  return actionable
    .map((c, idx) => {
      let score = idx; // later in DOM order = more recent = preferred
      if (wantSelector && c.selector === wantSelector) score += 1000;
      if (wantKind && c.kind === wantKind) score += 100;
      if (wantLabel && String(c.label || '').toLowerCase().includes(wantLabel)) score += 50;
      return { candidate: c, score };
    })
    .sort((a, b) => b.score - a.score);
}

function candidateConfidence(candidate, observationConfidence) {
  let confidence = observationConfidence;
  if (!candidate.selector) confidence -= 0.4;
  if (!candidate.label) confidence -= 0.1;
  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

export function createOverlayTargetSelector() {
  function select(observation, intent = {}) {
    const actionable = Array.isArray(observation?.actionable) ? observation.actionable : [];

    if (observation?.permission_prompts?.length > 1) {
      return {
        ok: false,
        blocker: 'LOW_CONFIDENCE',
        reason: 'multiple_simultaneous_permission_prompts',
        evidence: { count: observation.permission_prompts.length },
        confidence: 0,
      };
    }

    if (actionable.length === 0) {
      return {
        ok: false,
        blocker: 'LOW_CONFIDENCE',
        reason: 'no_actionable_candidates',
        evidence: { url: observation?.evidence?.url || '' },
        confidence: 0,
      };
    }

    const ranked = rankCandidates(actionable, intent);
    const top = ranked[0];
    const confidence = candidateConfidence(top.candidate, observation?.confidence ?? 0.3);

    if (confidence < MIN_CONFIDENCE) {
      return {
        ok: false,
        blocker: 'LOW_CONFIDENCE',
        reason: 'top_candidate_below_confidence_threshold',
        evidence: { candidate: top.candidate, threshold: MIN_CONFIDENCE },
        confidence,
      };
    }

    return {
      ok: true,
      target: top.candidate,
      confidence,
      evidence: { url: observation?.evidence?.url || '', observed_at: observation?.observed_at || null, rank_position: 0 },
    };
  }

  return { select };
}

export default { createOverlayTargetSelector };
