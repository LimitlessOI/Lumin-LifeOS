/**
 * SYNOPSIS: Exports buildBlockedReturn — lumin-factory/missions/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/builder/blocked-return.js.
 */
export function buildBlockedReturn(input) {
  return {
    status: 'BLOCKED_RETURN_TO_BPB',
    mission_id: input.mission_id,
    blueprint_id: input.blueprint_id,
    step_id: input.step_id,
    gap_type: input.gap_type,
    summary: input.summary,
    attempted_action: input.attempted_action,
    missing_information: input.missing_information,
    evidence: input.evidence
  };
}
