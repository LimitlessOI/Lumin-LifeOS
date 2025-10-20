// Chat API routes
const express = require('express');
const router = express.Router();
const { createConversation, getConversations, updateConversation } = require('../services/claude-chat');

// POST: Create a new conversation
router.post('/conversations', async (req, res) => {
    try {
        const conversation = await createConversation(req.body);
        res.status(201).json(conversation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Retrieve all conversations
router.get('/conversations', async (req, res) => {
    try {
        const conversations = await getConversations(req.user.id);
        res.status(200).json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT: Update conversation (e.g., pin or tag)
router.put('/conversations/:id', async (req, res) => {
    try {
        const conversation = await updateConversation(req.params.id, req.body);
        res.status(200).json(conversation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;