```javascript
require('dotenv').config();

module.exports = {
    apiKey: process.env.MAKE_COM_API_KEY,
    webhookUrl: process.env.MAKE_COM_WEBHOOK_URL
};
```