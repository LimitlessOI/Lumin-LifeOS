```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const ChatSession = require('./ChatSession');

class ChatMessage extends Model {}

ChatMessage.init({
  messageId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.UUID,
    references: {
      model: ChatSession,
      key: 'sessionId',
    },
    allowNull: false,
  },
  senderId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: 'ChatMessage',
  tableName: 'chat_messages'
});

module.exports = ChatMessage;
```