/**
 * SYNOPSIS: Health metrics for the BuilderOS cognitive spine.
 * Tracks reasoning depth, model fatigue, confidence drift, and consensus quality.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export function computeCognitiveSpineHealth({ reasoningSteps = [], modelCalls = [], confidenceHistory = [] }) {
  const depth = reasoningSteps.length;
  const fatigue = modelCalls.length > 0
    ? Math.min(1, modelCalls.filter((m) => m.tier === 'strong').length / Math.max(1, modelCalls.length))
    : 0;

  const confidenceDrift = confidenceHistory.length > 1
    ? confidenceHistory[confidenceHistory.length - 1] - confidenceHistory[0]
    : 0;

  const consensusQuality = reasoningSteps.length > 0
    ? reasoningSteps.filter((s) => s.consensus && s.propagated_confidence > 0.5).length / reasoningSteps.length
    : 0;

  return {
    depth,
    fatigue,
    confidence_drift: confidenceDrift,
    consensus_quality: consensusQuality,
    healthy: consensusQuality > 0.5 && Math.abs(confidenceDrift) < 0.3 && fatigue < 0.8,
    timestamp: new Date().toISOString(),
  };
}

export function recordModelCall(calls, { tier, model, cost = 0, success = true }) {
  return [...calls, { tier, model, cost, success, at: new Date().toISOString() }];
}
