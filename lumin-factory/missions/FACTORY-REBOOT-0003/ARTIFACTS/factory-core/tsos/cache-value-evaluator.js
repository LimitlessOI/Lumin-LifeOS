/**
 * SYNOPSIS: Exports cacheValueEvaluation — lumin-factory/missions/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/tsos/cache-value-evaluator.js.
 */
export function cacheValueEvaluation(entry) {
  return {
    answer_class: entry.answer_class,
    stability_evidence: entry.stability_evidence,
    cache_recommendation: entry.cache_recommendation
  };
}
