```javascript
const conversationService = require('../services/conversationService');
const aiProcessor = require('../services/aiProcessor');

exports.createConversation = async (req, res) => {
  try {
    const conversation = await conversationService.createConversation(req.user.id);
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Error creating conversation' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const conversation = await conversationService.getConversation(req.params.id);
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching conversation' });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const newMessage = await conversationService.addMessage(conversationId, req.user.id, message);
    await aiProcessor.processMessage(newMessage.id, message);
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Error posting message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await conversationService.getMessages(req.params.conversationId);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
};
```