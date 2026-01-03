const express = require('express');
const router = new express.Router();
const { queueTask } = require('../controllers/taskQueueController'); // assuming a controller exists for queuing tasks
router.post('/api/v1/task_queue', taskQueue);
module.exports = router;