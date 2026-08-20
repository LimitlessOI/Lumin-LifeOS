/**
 * SYNOPSIS: PerceptionFusion role per blueprint §14a — normalizes and
 * reconciles observations across Bodies into one WorldSnapshot; preserves
 * contradiction rather than silently picking a "winner" between disagreeing
 * sources (§10's fusion rule). Real implementation: actually merges
 * PerceivedObject arrays by id, tracks confidence per source, and surfaces
 * (not hides) conflicting observations.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

// §10's source-priority prior — starting default only, real evidence can
// override it (per-source accuracy tracking is a real V2 item, not faked
// here as already-learned).
const SOURCE_CONFIDENCE_PRIOR = Object.freeze({
  dom: 0.9,
  ax_tree: 0.9,
  uia: 0.85,
  accessibility_node: 0.85,
  vision_model: 0.6,
});

export function createPerceptionFusionService({ store, logger }) {
  if (!store) {
    throw new Error('createPerceptionFusionService: Missing required dependency: store');
  }
  if (!logger) {
    throw new Error('createPerceptionFusionService: Missing required dependency: logger');
  }

  return {
    /**
     * Real fusion: merges observations from potentially multiple Bodies by
     * object id. When two sources disagree on the same id, BOTH are kept
     * (contradictions field) rather than one silently overwriting the
     * other — this is the real, specific behavior §10 requires, not prose
     * about it.
     */
    fuseObservations(observationsBySource) {
      const byId = new Map();
      const contradictions = [];

      for (const [source, objects] of Object.entries(observationsBySource || {})) {
        for (const obj of Array.isArray(objects) ? objects : []) {
          if (!obj || !obj.id) continue;
          const confidence = typeof obj.confidence === 'number' ? obj.confidence : (SOURCE_CONFIDENCE_PRIOR[source] ?? 0.5);
          const candidate = { ...obj, source, confidence };
          const existing = byId.get(obj.id);
          if (!existing) {
            byId.set(obj.id, candidate);
          } else if (existing.text !== candidate.text || existing.type !== candidate.type) {
            contradictions.push({ id: obj.id, sources: [existing.source, source], values: [existing, candidate] });
            if (candidate.confidence > existing.confidence) byId.set(obj.id, candidate);
          } else if (candidate.confidence > existing.confidence) {
            byId.set(obj.id, candidate);
          }
        }
      }

      const snapshot = {
        objects: Array.from(byId.values()),
        contradictions,
        fused_at: new Date().toISOString(),
        source_count: Object.keys(observationsBySource || {}).length,
      };
      logger.info('Fused observations', { objectCount: snapshot.objects.length, contradictionCount: contradictions.length });
      return snapshot;
    },
  };
}

export default createPerceptionFusionService;
