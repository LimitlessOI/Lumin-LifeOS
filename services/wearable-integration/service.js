```javascript
const fetch = require('node-fetch');

class WearableIntegrationService {
  async syncData(wearableData) {
    // Logic to sync data from wearables
    // Example: Fetch data from a wearable API
    const response = await fetch('https://api.wearable.com/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wearableData),
    });
    return response.json();
  }
}

module.exports = new WearableIntegrationService();
```