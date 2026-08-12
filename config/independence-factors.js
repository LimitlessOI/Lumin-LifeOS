/**
 * SYNOPSIS: Effective independence between agents — how many genuinely distinct
 * perspectives a decision actually had, as opposed to how many votes it counted.
 *
 * Chair, 2026-08-11, citing 2026 multi-agent research on diversity collapse:
 * adding cooperating agents can REDUCE intellectual diversity, because strong
 * agents talking densely converge prematurely and authority-heavy structures
 * suppress dissent. Two conclusions follow, and both are mechanical:
 *
 *   1. Agreement is only evidence to the extent the agreers were independent.
 *      "Factory 1 and Factory 2 both produced X" is two proofs only if they could
 *      have failed separately. If they share the flaw, it is one failure counted
 *      twice.
 *
 *   2. Independence must be measured, not assumed from headcount. A Council of
 *      six near-identical models is weaker than three genuinely different ones.
 *
 * This is not hypothetical here. factory-2's dependency tree is a symlink to
 * factory-1's, chosen deliberately on 2026-08-11 to make the lane healthy without
 * a second install. It was the right call for speed and it is a real correlated-
 * failure channel: any defect originating in a shared dependency will be
 * reproduced identically by both lanes, and their agreement about it means
 * nothing. The honest fix is to say so in the confidence number rather than to
 * pretend the lanes are strangers.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Dimensions along which two agents can fail together. Weights are judgment, not
 * measurement (THINK, not KNOW): they encode how much of a shared failure mode
 * each dimension represents, and they are visible here precisely so they can be
 * argued with rather than buried in a scoring function.
 */
export const INDEPENDENCE_FACTORS = Object.freeze({
  model_lineage: 0.3,
  prompt_perspective: 0.15,
  dependency_tree: 0.15,
  retrieval_sources: 0.1,
  test_suite: 0.1,
  runtime: 0.05,
  architecture_interpretation: 0.1,
  prior_exposure_to_peer: 0.05,
});

const TOTAL_WEIGHT = Object.values(INDEPENDENCE_FACTORS).reduce((a, b) => a + b, 0);

/**
 * Pairwise similarity: the weighted share of dimensions on which two agents are
 * the same. Unknown dimensions count as SHARED, because "we never checked whether
 * these two could fail together" is not evidence that they can't.
 */
export function pairwiseSimilarity(a = {}, b = {}) {
  let shared = 0;
  const sharedFactors = [];
  for (const [factor, weight] of Object.entries(INDEPENDENCE_FACTORS)) {
    const left = a[factor];
    const right = b[factor];
    const unknown = left === undefined || right === undefined;
    const same = unknown || JSON.stringify(left) === JSON.stringify(right);
    if (same) {
      shared += weight;
      sharedFactors.push({ factor, value: unknown ? 'unknown_assumed_shared' : left });
    }
  }
  return { similarity: shared / TOTAL_WEIGHT, shared_factors: sharedFactors };
}

/**
 * Effective number of independent perspectives, in the spirit of an effective
 * sample size: N identical agents count as 1, N unrelated agents count as N.
 *
 *   effective = N / (1 + mean_pairwise_similarity * (N - 1))
 *
 * This lets the Presiding Steward say "six votes, 2.1 effective perspectives",
 * which is a far more honest input to a consequential decision than a headcount.
 */
export function effectiveIndependence(participants = []) {
  const n = participants.length;
  if (n === 0) return { participant_count: 0, effective_perspectives: 0, mean_similarity: 0, shared_factors: [] };
  if (n === 1) return { participant_count: 1, effective_perspectives: 1, mean_similarity: 0, shared_factors: [] };

  const pairs = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const { similarity, shared_factors } = pairwiseSimilarity(participants[i], participants[j]);
      pairs.push({
        pair: [participants[i].id ?? i, participants[j].id ?? j],
        similarity: Number(similarity.toFixed(3)),
        shared_factors,
      });
    }
  }
  const mean = pairs.reduce((a, p) => a + p.similarity, 0) / pairs.length;
  const effective = n / (1 + mean * (n - 1));

  // Factors shared by EVERY pair are the ones that make the whole group
  // correlated, which is what a reviewer actually needs to see.
  const common = pairs
    .map((p) => new Set(p.shared_factors.map((f) => f.factor)))
    .reduce((acc, set) => new Set([...acc].filter((f) => set.has(f))), new Set(pairs[0].shared_factors.map((f) => f.factor)));

  return {
    participant_count: n,
    effective_perspectives: Number(effective.toFixed(2)),
    mean_similarity: Number(mean.toFixed(3)),
    pairs,
    shared_factors: [...common],
    correlated: effective < n * CORROBORATION_MIN_INDEPENDENCE_RATIO,
    method: 'effective sample size over weighted factor similarity; unknown factors counted as shared (fail-closed)',
  };
}

/**
 * How much of the theoretical independence a group must retain before agreement
 * counts as corroboration, as a fraction of participant count.
 *
 * Deliberately a ratio and not an absolute number. Requiring N effective
 * perspectives from N agents demands perfect orthogonality, which no two real
 * lanes have — they run the same runtime and read the same repository at minimum,
 * so an absolute threshold would make corroboration permanently unreachable and
 * the gate would be ignored within a week. 0.75 tolerates incidental overlap
 * while refusing the case that matters: agents sharing model lineage, dependency
 * tree, or test suite, where one flaw surfaces as unanimous agreement.
 */
export const CORROBORATION_MIN_INDEPENDENCE_RATIO = 0.75;

/** True when a group is too correlated for its agreement to mean anything. */
export function isCorrelated(independence) {
  return independence.effective_perspectives < independence.participant_count * CORROBORATION_MIN_INDEPENDENCE_RATIO;
}
