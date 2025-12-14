const HealthRoiMetric = require('../../models/healthRoiMetrics');

async function calculateRoi(userId) {
  try {
    const metrics = await HealthRoiMetric.findAll({ where: { userId } });
    // Calculate ROI based on metrics
    const roi = metrics.reduce((total, metric) => total + (metric.value || 0), 0);
    return roi;
  } catch (error) {
    console.error(`Failed to calculate ROI: ${error.message}`);
    throw error;
  }
}

module.exports = { calculateRoi };