import { randomUUID } from 'crypto';

/**
 * Simple text utilities to approximate drift signals locally.
 * This is intentionally lightweight and local-only.
 */

export function repeatedPhrasingScore(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  const counts = new Map();
  for (const m of messages) {
    const key = (m || '').trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const maxCount = Math.max(0, ...counts.values());
  return maxCount / Math.max(1, messages.length); // 0..1
}

export function decliningDisagreementScore(votes = []) {
  if (!Array.isArray(votes) || votes.length === 0) return 0;
  const disagreements = votes.map((v) => Math.abs((v?.spread ?? 0))).filter((x) => !isNaN(x));
  if (disagreements.length === 0) return 0;
  const avg = disagreements.reduce((a, b) => a + b, 0) / disagreements.length;
  return Math.max(0, 1 - Math.min(1, avg)); // lower spread => higher score (0..1)
}

export function risingCertaintyScore(responses = []) {
  if (!Array.isArray(responses) || responses.length === 0) return 0;
  const certainty = responses
    .map((r) => Number(r?.certainty ?? 0))
    .filter((x) => !isNaN(x) && x >= 0 && x <= 1);
  if (certainty.length === 0) return 0;
  const avg = certainty.reduce((a, b) => a + b, 0) / certainty.length;
  return avg; // 0..1
}

export function aggregateDriftSignals({ messages = [], votes = [], responses = [] }) {
  const phrasing = repeatedPhrasingScore(messages);
  const disagreement = decliningDisagreementScore(votes);
  const certainty = risingCertaintyScore(responses);

  // Simple heuristic aggregation
  const severity = Math.round((phrasing * 40) + (disagreement * 30) + (certainty * 30)); // 0..100

  const recommendations = [];
  if (phrasing > 0.6) recommendations.push('role reshuffle');
  if (disagreement > 0.5 || certainty > 0.6) recommendations.push('reweighting');
  if (severity >= 60) recommendations.push('forced FSAR');

  return {
    id: `drift_${randomUUID()}`,
    severity,
    signals: {
      repeated_phrasing: phrasing,
      declining_disagreement: disagreement,
      rising_certainty: certainty,
    },
    recommendations,
  };
}

export default aggregateDriftSignals;
