const express = require('express');
const router = express.Router();
const { callOutreach, smsOutreach } = require('../middleware/simulationMiddleware');

// POST /api/v1/outreach/call
router.post('/call', callOutreach);

// POST /api/v1/outreach/sms
router.post('/sms', smsOutreach);

module.exports = router;