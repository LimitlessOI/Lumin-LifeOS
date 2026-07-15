/**
 * SYNOPSIS: Exports getEmotionalIntelligenceSignals — services/emotionalIntelligenceSignals.js.
 */
export const joy_score_log = [
  { timestamp: '2023-10-01T00:00:00Z', score: 7 },
  { timestamp: '2023-10-02T00:00:00Z', score: 8 },
  { timestamp: '2023-10-03T00:00:00Z', score: 6 },
  // more data
];

export const wearable_data = [
  { timestamp: '2023-10-01T00:00:00Z', heartRate: 70, steps: 1000 },
  { timestamp: '2023-10-02T00:00:00Z', heartRate: 75, steps: 2000 },
  { timestamp: '2023-10-03T00:00:00Z', heartRate: 72, steps: 1500 },
  // more data
];

export function getEmotionalIntelligenceSignals() {
  return { joy_score_log, wearable_data };
}
