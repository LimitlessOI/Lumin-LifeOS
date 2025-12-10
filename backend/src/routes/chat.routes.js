```javascript
const express = require('express');
const router = express.Router();
const chatService = require('../services/chat.service');

// Create a new chat session
router.post('/session', async (req, res) => {
  try {
    const session = await chatService.createSession(req.body.userId);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Unable to create chat session' });
  }
});

// Send a message in a chat session
router.post('/message', async (req, res) => {
  try {
    const message = await chatService.sendMessage(req.body.sessionId, req.body.senderId, req.body.content);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Unable to send message' });
  }
});

// Get messages for a chat session
router.get('/session/:sessionId/messages', async (req, res) => {
  try {
    const messages = await chatService.getMessages(req.params.sessionId);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch messages' });
  }
});

module.exports = router;
```