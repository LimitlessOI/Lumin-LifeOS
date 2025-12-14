```javascript
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');

const createSession = async (userId) => {
  return await ChatSession.create({ userId });
};

const sendMessage = async (sessionId, senderId, content) => {
  return await ChatMessage.create({ sessionId, senderId, content });
};

const getMessages = async (sessionId) => {
  return await ChatMessage.findAll({ where: { sessionId } });
};

module.exports = {
  createSession,
  sendMessage,
  getMessages,
};
```