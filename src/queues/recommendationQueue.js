```javascript
const { Queue } = require('bullmq');
const recommendationWorker = require('../workers/recommendationWorker');

const recommendationQueue = new Queue('recommendationQueue');

recommendationQueue.process(recommendationWorker.process);

module.exports = recommendationQueue;
```