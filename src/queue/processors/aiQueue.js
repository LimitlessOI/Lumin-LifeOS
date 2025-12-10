```javascript
const Queue = require('bull');
const aiProcessor = require('../../services/aiProcessor');

const aiQueue = new Queue('aiQueue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  }
});

aiQueue.process(async (job) => {
  await aiProcessor.processMessage(job.data.messageId, job.data.message);
});

module.exports = aiQueue;
```