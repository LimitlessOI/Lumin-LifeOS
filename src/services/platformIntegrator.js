```javascript
const axios = require('axios');

async function handleWebhook(req, res) {
  const { data } = req.body;
  // Process data and interact with e-commerce API
  try {
    const response = await axios.post('https://api.example.com/webhook', data);
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).send('Error processing webhook');
  }
}

module.exports = { handleWebhook };
```