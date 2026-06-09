export function recordConsensusSession(entry) {
  return {
    type: 'consensus_session',
    original_positions: entry.original_positions,
    final_synthesis: entry.final_synthesis,
    participants: entry.participants
  };
}
