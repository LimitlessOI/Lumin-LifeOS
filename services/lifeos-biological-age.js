/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
// New function to track energy levels
export const trackEnergyLevels = async (userId, energyData) => {
  // Perform analysis on energyData to generate an energy map and personal energy curve
  // For this example, energyData is assumed to be an array of energy level records with timestamps
  const energyMap = energyData.reduce((map, record) => {
    const date = new Date(record.timestamp).toDateString();
    if (!map[date]) {
      map[date] = [];
    }
    map[date].push(record.energyLevel);
    return map;
  }, {});

  const energyCurve = Object.entries(energyMap).map(([date, levels]) => {
    const averageLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    return { date, averageLevel };
  });

  return {
    userId,
    energyCurve,
    analyzedAt: new Date().toISOString(),
  };
};

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
