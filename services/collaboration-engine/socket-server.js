```javascript
const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (ws) => {
    ws.on('message', (message) => {
        // Broadcast message to all connected clients
        server.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

console.log('Collaboration Service WebSocket server running on port 8080');
```