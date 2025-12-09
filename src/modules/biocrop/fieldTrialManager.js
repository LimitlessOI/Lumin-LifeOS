const { FieldTrial, BiocropVariety } = require('../../models');

class FieldTrialManager {
  async createTrial(varietyId, location, startDate, endDate) {
    const variety = await BiocropVariety.findByPk(varietyId);
    if (!variety) {
      throw new Error('Variety not found');
    }
    return await FieldTrial.create({
      varietyId,
      location,
      startDate,
      endDate,
      status: 'Pending'
    });
  }

  async aggregateResults(trialId) {
    // Implement logic to aggregate trial results
    return `Results for trial ${trialId}`;
  }
}

module.exports = new FieldTrialManager();