const axios = require('axios');

async function pushMicroCoachingMessage(userId, message) {
  try {
    // Push message to a wearable device API
    await axios.post(`https://api.wearable.com/push`, { userId, message });
  } catch (error) {
    console.error(`Failed to push micro-coaching message: ${error.message}`);
  }
}

module.exports = { pushMicroCoachingMessage };