```javascript
const { Queue, Worker } = require('bullmq');
const { reviewCode } = require('../ai/reviewer');

const reviewQueue = new Queue('code-review');

const worker = new Worker('code-review', async job => {
    const projectId = job.data.projectId;
    await reviewCode(projectId);
});

module.exports = { reviewQueue };
```