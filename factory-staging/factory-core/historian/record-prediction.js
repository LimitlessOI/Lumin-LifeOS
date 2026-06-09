export function recordPrediction(entry) {
  return {
    type: 'prediction',
    prediction: entry.prediction,
    confidence: entry.confidence,
    domain: entry.domain
  };
}
