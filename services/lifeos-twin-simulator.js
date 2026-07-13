/**
 * SYNOPSIS: Exports simulateTwinReactions — services/lifeos-twin-simulator.js.
 */
export async function simulateTwinReactions(userId, uiData) {
  return {
    userId,
    uiData,
    reactions: [],
    simulated: false
  };
}