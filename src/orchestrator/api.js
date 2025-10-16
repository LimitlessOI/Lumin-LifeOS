const express = require('express');
const router = express.Router();
const movingAvgWaitMs = require('./movingAvg'); // Assuming the moving average is stored in a separate module

router.get('/api/v1/orch/queue', (req, res) => {
    res.json({ moving_avg_wait_ms: movingAvgWaitMs });
});

module.exports = router;