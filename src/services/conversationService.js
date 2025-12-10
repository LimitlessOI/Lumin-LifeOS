```javascript
const pool = require('../config/database');

exports.createConversation = async (userId) => {
  const result = await pool.query('INSERT INTO conversations (user_id) VALUES ($1) RETURNING *', [userId]);
  return result.rows[0];
};

exports.getConversation = async (conversationId) => {
  const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  return result.rows[0];
};

exports.addMessage = async (conversationId, sender, message) => {
  const result = await pool.query('INSERT INTO messages (conversation_id, sender, message) VALUES ($1, $2, $3) RETURNING *', [conversationId, sender, message]);
  return result.rows[0];
};

exports.getMessages = async (conversationId) => {
  const result = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at', [conversationId]);
  return result.rows;
};
```