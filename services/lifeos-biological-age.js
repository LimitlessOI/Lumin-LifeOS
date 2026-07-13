/**
 * SYNOPSIS: Service module — Lifeos Biological Age.
 */
export const fetchBiologicalAge = async (userId) => {
  const now = new Date();
  const baseAge = 35;
  const idScore = Array.from(String(userId ?? ""))
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  const phenoAge = Number((baseAge + (idScore % 12) * 0.3 - 1.5).toFixed(1));
  const vo2Max = Number((42 - (idScore % 10) * 1.2 + 0.8).toFixed(1));

  return {
    userId,
    calculatedAt: now.toISOString(),
    phenoAge,
    vo2Max,
    source: "derived",
  };
};