/**
 * SYNOPSIS: Canonical carry-forward context for governed repair retries.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */

function uniqueStrings(values = []) {
  return [...new Set(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )];
}

export function buildAttemptCarryForwardContext({
  attemptNumber,
  priorAttempts = [],
  lessonsLoaded = [],
  researchCompleted = false,
  consensusParticipants = [],
  proposedFix = null,
  outcome = null,
} = {}) {
  const attempt = Number(attemptNumber || 0);
  const prior_attempts_consulted = (priorAttempts || [])
    .map((entry) => Number(entry?.attempt || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  const normalized = {
    prior_attempts_consulted,
    lessons_loaded: uniqueStrings(lessonsLoaded),
    research_completed: researchCompleted === true,
    consensus_participants: uniqueStrings(consensusParticipants),
    proposed_fix: proposedFix ? String(proposedFix).trim() : null,
    outcome: outcome ? String(outcome).trim() : null,
  };

  if (attempt <= 1) {
    return { ok: true, blocked_return: null, attempt_context: normalized };
  }

  const missing = [];
  if (!normalized.prior_attempts_consulted.length) missing.push('prior_attempts_consulted');
  if (!normalized.lessons_loaded.length) missing.push('lessons_loaded');
  if (!normalized.proposed_fix) missing.push('proposed_fix');

  if (missing.length) {
    return {
      ok: false,
      blocked_return: {
        code: 'BLOCKED_CARRY_FORWARD_CONTEXT_MISSING',
        missing,
        attempt_number: attempt,
      },
      attempt_context: normalized,
    };
  }

  return { ok: true, blocked_return: null, attempt_context: normalized };
}
