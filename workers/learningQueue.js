```js
const Queue = require('bull');
const AdaptiveLearningEngine = require('../services/adaptiveModel');

const learningQueue = new Queue('learning-tasks');

learningQueue.process(async (job) => {
  const { data } = job;
  AdaptiveLearningEngine.trainModel(data);
});

module.exports = learningQueue;
```