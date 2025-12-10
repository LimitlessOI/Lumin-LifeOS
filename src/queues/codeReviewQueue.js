```javascript
const Queue = require('bull');
const analysisEngine = require('../services/code-review/analysisEngine');
const submissionService = require('../services/code-review/submissionService');

const codeReviewQueue = new Queue('code-review', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

codeReviewQueue.process(async (job, done) => {
  const { submissionId, language, code } = job.data;

  try {
    const result = await analysisEngine.analyzeCode(language, code);
    await submissionService.updateSubmissionStatus(submissionId, 'completed', result);
    done();
  } catch (error) {
    await submissionService.updateSubmissionStatus(submissionId, 'failed', { error: error.message });
    done(error);
  }
});

module.exports = codeReviewQueue;
```