/**
 * SYNOPSIS: Exports recordOutcome — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/historian/record-outcome.js.
 */
export function recordOutcome(entry) {
  return {
    type: 'outcome',
    outcome: entry.outcome,
    variance: entry.variance,
    linked_prediction_id: entry.linked_prediction_id
  };
}
