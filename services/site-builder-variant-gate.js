// SYNOPSIS:
// @ssot docs/products/site-builder/PRODUCT_HOME.md

export function decideVariantFate({ variantScore, uxHeuristics, baseline }) {
  const result = {
    keep: true,
    reason: '',
    rank: 0
  };

  // Check if the overall UX heuristic score is below the threshold
  if (uxHeuristics?.overall !== undefined && uxHeuristics.overall < 60) {
    result.keep = false;
    result.reason = 'UX heuristics below minimum threshold';
    return result;
  }

  // Check if the baseline visual score is present
  if (baseline?.visualScore !== undefined) {
    if (variantScore?.scorePct !== undefined && variantScore.scorePct < baseline.visualScore) {
      result.keep = false;
      result.reason = 'Variant score below baseline visual score';
      return result;
    }
  } else {
    result.reason = 'Baseline data missing, keeping with caveat';
  }

  // Calculate rank based on structural score and UX heuristics
  const structuralScore = variantScore?.scorePct || 0;
  const uxScore = uxHeuristics?.overall || 0;
  result.rank = (structuralScore + uxScore) / 2;

  return result;
}

export { decideVariantFate as default };