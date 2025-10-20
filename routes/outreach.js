const express = require('express');
const router = express.Router();
const outreachController = require('../controllers/outreachController');

router.post('/call', outreachController.initiateCall);
router.post('/sms', outreachController.sendSMS);
router.post('/webhook/twilio', outreachController.twilioWebhook);

module.exports = router;
