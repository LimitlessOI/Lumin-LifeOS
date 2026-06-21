/**
 * SYNOPSIS: Exports recordDecision — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/historian/record-decision.js.
 */
export function recordDecision(entry) {
  return {
    type: 'decision',
    mission_id: entry.mission_id,
    decision: entry.decision,
    authority: entry.authority,
    provenance: entry.provenance
  };
}
