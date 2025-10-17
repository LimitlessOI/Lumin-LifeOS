// vapiWebhookHandler.js
const express = require('express');
const router = express.Router();
const notionIntegration = require('./notionIntegration');

// Endpoint to handle call ended webhook
router.post('/api/vapi/call-ended', async (req, res) => {
    const { callData } = req.body;
    await notionIntegration.logCall(callData);
    res.status(200).send('Call logged successfully');
});

module.exports = router;