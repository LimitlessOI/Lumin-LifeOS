```javascript
const WebSocket = require('ws');
const logger = require('../../utils/logger');

const wsServer = new WebSocket.Server({ port: 8080 });

wsServer.on('connection', (ws) => {
  ws.on('message', (message) => {
    logger.info('Received message:', message);
    // Handle incoming messages and sync data
  });

  ws.send('Connection established');
});

function broadcast(data) {
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = {
  broadcast
};
```