```javascript
const axios = require('axios');

exports.sendToZendesk = async (ticketData) => {
  try {
    const response = await axios.post('https://your-zendesk-url.com/api/v2/tickets', ticketData, {
      auth: {
        username: process.env.ZENDESK_USERNAME,
        password: process.env.ZENDESK_PASSWORD,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending data to Zendesk:', error);
  }
};
```