```javascript
const EventEmitter = require('events');
const axios = require('axios');
const redis = require('redis');

class StreamProcessor extends EventEmitter {
  constructor() {
    super();
    this.client = redis.createClient();
    this.client.on('error', (err) => console.error('Redis error:', err));
    this.externalAPIs = ['https://api.wearable.com/data', 'https://api.envirodata.com/conditions'];
  }

  async fetchData() {
    try {
      const data = await Promise.all(
        this.externalAPIs.map(api => axios.get(api))
      );
      this.processData(data.map(response => response.data));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  processData(data) {
    data.forEach(item => {
      this.client.lpush('health-data', JSON.stringify(item), (err) => {
        if (err) console.error('Redis push error:', err);
      });
    });
    this.emit('dataProcessed', data);
  }
}

const streamProcessor = new StreamProcessor();
streamProcessor.on('dataProcessed', (data) => {
  console.log('Data processed:', data.length, 'items');
});

// Simulate continuous data fetching
setInterval(() => streamProcessor.fetchData(), 5000);

module.exports = streamProcessor;
```