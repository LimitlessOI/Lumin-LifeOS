// SYNOPSIS: Decide whether a generated Site Builder variant is kept or culled.
// @ssot docs/products/site-builder/PRODUCT_HOME.md
//
// Hard-kill is intentional for weak UX / below-baseline variants, but callers
// must fail-open when EVERY candidate is culled (see buildVariants). A missing
// or failed UX score must never be treated as overall:0.

/** Catastrophic UX only — the 0–100 heuristic is coarse; <60 false-killed real shells. */
export const UX_HARD_KILL_THRESHOLD = 25;

export function decideVariantFate({ variantScore, uxHeuristics, baseline }) {
  const result = {
    keep: true,
    reason: '',
    rank: 0
  };

  // Only hard-kill on a real UX score that is catastrophic. undefined/null = skip.
  if (
    uxHeuristics != null
    && typeof uxHeuristics.overall === 'number'
    && Number.isFinite(uxHeuristics.overall)
    && uxHeuristics.overall < UX_HARD_KILL_THRESHOLD
  ) {
    result.keep = false;
    result.reason = 'UX heuristics below minimum threshold';
    return result;
  }

  if (baseline != null && typeof baseline.visualScore === 'number' && Number.isFinite(baseline.visualScore)) {
    if (
      variantScore != null
      && typeof variantScore.scorePct === 'number'
      && Number.isFinite(variantScore.scorePct)
      && variantScore.scorePct < baseline.visualScore
    ) {
      result.keep = false;
      result.reason = 'Variant score below baseline visual score';
      return result;
    }
  } else {
    result.reason = 'Baseline data missing, keeping with caveat';
  }

  const structuralScore = variantScore?.scorePct || 0;
  const uxScore = typeof uxHeuristics?.overall === 'number' ? uxHeuristics.overall : 0;
  result.rank = (structuralScore + uxScore) / 2;

  return result;
}

export { decideVariantFate as default };