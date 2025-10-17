// src/orchestrator/api.js

const express = require('express');
const { getQueueStatus } = require('./queue-status');

const router = express.Router();

// GET /api/v1/orch/queue
router.get('/queue', (req, res) => {
  try {
    const queueStatus = getQueueStatus();
    res.status(200).json(queueStatus);
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
