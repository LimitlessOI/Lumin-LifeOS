/**
 * SYNOPSIS: Exports recordPrediction — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/historian/record-prediction.js.
 */
export function recordPrediction(entry) {
  return {
    type: 'prediction',
    prediction: entry.prediction,
    confidence: entry.confidence,
    domain: entry.domain
  };
}
