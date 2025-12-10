```javascript
const { create } = require('ipfs-http-client');

class IPFSManager {
  constructor() {
    this.client = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
  }

  async storeData(data) {
    try {
      const { path } = await this.client.add(JSON.stringify(data));
      return path;
    } catch (error) {
      console.error('Error storing data on IPFS:', error);
      return null;
    }
  }

  async retrieveData(hash) {
    try {
      const stream = this.client.cat(hash);
      let data = '';
      for await (const chunk of stream) {
        data += chunk.toString();
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error retrieving data from IPFS:', error);
      return null;
    }
  }
}

module.exports = IPFSManager;
```