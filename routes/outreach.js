const express = require('express');
const router = express.Router();
const outreachController = require('../controllers/outreachController');
const authMiddleware = require('../middleware/authMiddleware');

// Call endpoint
router.post('/call', authMiddleware, outreachController.initiateCall);

// SMS endpoint
router.post('/sms', authMiddleware, outreachController.sendSms);

// Twilio webhook
router.post('/webhook/twilio', outreachController.twilioWebhook);

module.exports = router;
