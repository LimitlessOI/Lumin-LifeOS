export function recordDecision(entry) {
  return {
    type: 'decision',
    mission_id: entry.mission_id,
    decision: entry.decision,
    authority: entry.authority,
    provenance: entry.provenance
  };
}
