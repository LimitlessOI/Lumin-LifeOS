```javascript
const EventEmitter = require('events');

class FederatedCoordinator extends EventEmitter {
  constructor() {
    super();
    this.clients = [];
  }

  registerClient(client) {
    this.clients.push(client);
    console.log('Client registered for federated learning');
  }

  async startRound() {
    console.log('Starting federated learning round...');
    try {
      const results = await Promise.all(this.clients.map(client => client.train()));
      this.aggregateResults(results);
    } catch (error) {
      console.error('Error during federated round:', error);
    }
  }

  aggregateResults(results) {
    // Aggregate client updates into a global model
    console.log('Aggregating results...', results);
    this.emit('roundCompleted', results);
  }
}

const coordinator = new FederatedCoordinator();
coordinator.on('roundCompleted', (results) => {
  console.log('Federated learning round completed');
});

module.exports = coordinator;
```