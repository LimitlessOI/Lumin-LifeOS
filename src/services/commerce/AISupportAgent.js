```javascript
const { Langchain } = require('langchain');

class AISupportAgent {
  static async handleCustomerQuery(query) {
    try {
      const langchain = new Langchain();
      const response = await langchain.processQuery(query);
      return response;
    } catch (error) {
      console.error('Error handling customer query:', error);
      throw error;
    }
  }
}

module.exports = AISupportAgent;
```