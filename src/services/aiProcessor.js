```javascript
const aiProvider = require('openai');  // Example AI provider integration
const pool = require('../config/database');

exports.processMessage = async (messageId, message) => {
  try {
    const response = await aiProvider.generateResponse(message);
    await pool.query('INSERT INTO ai_responses (message_id, response) VALUES ($1, $2)', [messageId, response]);
  } catch (error) {
    console.error('Error processing AI message:', error);
  }
};
```