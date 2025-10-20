const express = require('express');
const router = express.Router();

// Route to serve chat UI
router.get('/', (req, res) => {
    res.status(200).send('Chat UI');
});

// Route to send a message to Claude
router.post('/api/v1/chat/send', (req, res) => {
    const message = req.body.message;
    // Logic to send message to Claude
    res.status(200).json({ success: true, message: 'Message sent', data: message });
});

// Route to load past conversations
router.get('/api/v1/chat/history', (req, res) => {
    // Logic to retrieve chat history
    res.status(200).json({ success: true, history: [] }); // Example response
});

// Route to create a task from a message
router.post('/api/v1/chat/create-task', (req, res) => {
    const taskDetails = req.body;
    // Logic to convert message to orchestrator task
    res.status(201).json({ success: true, task: taskDetails });
});

module.exports = router;