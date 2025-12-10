```javascript
const { analyzePaymentPatterns } = require('../services/analysisEngine');
const { OptimizationInsight } = require('../models/OptimizationInsight');

const triggerAnalysis = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { customerId } = req.body;
    const insights = await analyzePaymentPatterns(clientId, customerId);
    await OptimizationInsight.create({
      clientId,
      insightData: insights
    });
    res.status(202).json({ message: 'Analysis started', insights });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getInsights = async (req, res) => {
  try {
    const { clientId } = req.params;
    const insights = await OptimizationInsight.findAll({ where: { clientId } });
    res.json(insights);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  triggerAnalysis,
  getInsights
};
```