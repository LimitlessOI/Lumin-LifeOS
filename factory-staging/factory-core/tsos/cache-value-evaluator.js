/**
 * SYNOPSIS: Exports cacheValueEvaluation — factory-staging/factory-core/tsos/cache-value-evaluator.js.
 */
export function cacheValueEvaluation(entry) {
  return {
    answer_class: entry.answer_class,
    stability_evidence: entry.stability_evidence,
    cache_recommendation: entry.cache_recommendation
  };
}
