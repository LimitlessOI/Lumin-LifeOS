```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class ChatSession extends Model {}

ChatSession.init({
  sessionId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: 'ChatSession',
  tableName: 'chat_sessions'
});

module.exports = ChatSession;
```