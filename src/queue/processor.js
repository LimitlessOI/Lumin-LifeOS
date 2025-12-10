const Queue = require('bull');
const config = require('../config');

const queue = new Queue('task-queue', {
  redis: {
    host: config.get('redis.host'),
    port: config.get('redis.port')
  }
});

queue.process(async (job) => {
  // Process job
});

module.exports = queue;