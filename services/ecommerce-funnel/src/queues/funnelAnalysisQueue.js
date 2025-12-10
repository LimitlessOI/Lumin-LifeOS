```javascript
const Queue = require('bull');
const aiAnalyticsService = require('../services/aiAnalyticsService');

const funnelAnalysisQueue = new Queue('funnelAnalysis', process.env.REDIS_URL);

funnelAnalysisQueue.process(async (job) => {
  const recommendations = aiAnalyticsService.analyzeFunnels(job.data.funnels);
  console.log('AI Recommendations:', recommendations);
  return recommendations;
});

module.exports = funnelAnalysisQueue;
```