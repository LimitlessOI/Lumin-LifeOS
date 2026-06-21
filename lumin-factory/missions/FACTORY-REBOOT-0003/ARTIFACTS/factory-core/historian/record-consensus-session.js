/**
 * SYNOPSIS: Exports recordConsensusSession — lumin-factory/missions/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/historian/record-consensus-session.js.
 */
export function recordConsensusSession(entry) {
  return {
    type: 'consensus_session',
    original_positions: entry.original_positions,
    final_synthesis: entry.final_synthesis,
    participants: entry.participants
  };
}
