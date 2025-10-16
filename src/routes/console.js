const express = require('express');
const router = express.Router();
const { handleConversation } = require('../services/conversation-router');

router.get('/', (req, res) => {
    res.sendFile('console.html', { root: 'public' });
});

router.post('/conversation', handleConversation);

module.exports = router;