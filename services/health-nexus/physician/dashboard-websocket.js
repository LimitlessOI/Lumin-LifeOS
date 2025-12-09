```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  ws.on('message', message => {
    console.log('Received message:', message);
    // Handle incoming messages from dashboard
  });

  // Send a welcome message
  ws.send(JSON.stringify({ message: 'Connected to physician dashboard' }));
});

console.log('WebSocket server is running on ws://localhost:8080');
```