const express = require('express');
const router = new express.Router();
const { getInsightAnalysis } = require('../controllers/systemInsightController'); // assuming a controller exists for analytics data retrieval
router.get('/api/v1/system_insights', getInsightAnalysis);
module.exports = router;