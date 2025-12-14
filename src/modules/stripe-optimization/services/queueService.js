```javascript
const Queue = require('bull');
const { analyzePaymentPatterns } = require('./analysisEngine');
const { AnalysisJob } = require('../models/AnalysisJob');

const analysisQueue = new Queue('analysisQueue');

analysisQueue.process(async (job) => {
  const { clientId, customerId } = job.data;
  const insights = await analyzePaymentPatterns(clientId, customerId);
  await AnalysisJob.update({ status: 'completed', result: insights }, { where: { id: job.id } });
});

const addAnalysisJob = async (clientId, customerId) => {
  const job = await AnalysisJob.create({ clientId, status: 'pending' });
  await analysisQueue.add({ clientId, customerId, jobId: job.id });
  return job;
};

module.exports = {
  addAnalysisJob
};
```