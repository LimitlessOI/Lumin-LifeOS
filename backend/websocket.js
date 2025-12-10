```js
const WebSocket = require('ws');

const setupWebSocket = (server) => {
    const wss = new WebSocket.Server({ server, path: '/ws/automation/updates' });

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            console.log('Received:', message);
        });

        ws.send(JSON.stringify({ message: 'Connected to WebSocket server' }));
    });

    return wss;
};

module.exports = setupWebSocket;
```