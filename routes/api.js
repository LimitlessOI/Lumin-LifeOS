const express = require('express');
const router = express.Router();
const callAnalyzerController = require('../controllers/callAnalyzerController');

router.post('/analyze-call', callAnalyzerController.analyzeCall);

module.exports = router;