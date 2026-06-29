/**
 * SYNOPSIS: Canonical self-repair escalation policy for BuilderOS repair loops.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
export const SELF_REPAIR_MAX_ATTEMPTS = 3;

export const QUORUM_ROUNDS_PER_STAGE = 3;

export function getSelfRepairAttemptStage(attempt) {
  const n = Number(attempt || 0);
  if (n <= 1) return 'same_tier_initial';
  if (n === 2) return 'same_tier_lessons';
  return 'same_tier_research_consensus';
}

export function buildSelfRepairAttemptRequirements(attempt) {
  const stage = getSelfRepairAttemptStage(attempt);
  return {
    attempt: Number(attempt || 0),
    stage,
    require_prior_lessons: Number(attempt || 0) >= 2,
    require_research: Number(attempt || 0) >= 3,
    require_consensus_context: Number(attempt || 0) >= 3,
  };
}

export function shouldRunWebSearchBeforeAttempt(attempt) {
  return Number(attempt) === SELF_REPAIR_MAX_ATTEMPTS;
}
