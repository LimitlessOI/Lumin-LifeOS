```javascript
const Queue = require('bull');
const { processCodeReview } = require('../services/code-review-service/index');

// Create a new Bull queue
const codeReviewQueue = new Queue('code-review', 'redis://127.0.0.1:6379');

// Process jobs in the queue
codeReviewQueue.process(async (job) => {
  try {
    await processCodeReview(job.data);
  } catch (error) {
    console.error('Error processing job:', error);
    throw error;
  }
});

// Export the queue for use elsewhere in the application
module.exports = codeReviewQueue;
```