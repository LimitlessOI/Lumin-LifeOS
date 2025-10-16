// src/orchestrator/queue-status.js

const queueData = [
  // Sample data structure for demonstration
  { status: 'queued' },
  { status: 'claimed' },
  { status: 'done' },
  // ... add more sample data as needed
];

function getQueueStatus() {
  const lastEntries = queueData.slice(-30);
  const response = {
    queued: lastEntries.filter(item => item.status === 'queued'),
    claimed: lastEntries.filter(item => item.status === 'claimed'),
    done: lastEntries.filter(item => item.status === 'done'),
  };
  return response;
}

module.exports = { getQueueStatus };