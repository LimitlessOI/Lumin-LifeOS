const express = require('express');
const router = express.Router();
const notifier = require('../services/notifier');

router.post('/test-sms', async (req, res) => {
    try {
        await notifier.notifyHighSeverityWaiting();
        res.status(200).send({ message: 'Test SMS sent successfully.' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to send test SMS.', details: error.message });
    }
});

module.exports = router;