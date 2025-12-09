const WebSocket = require('ws');

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('message', (message) => this.broadcast(message, ws));
      ws.on('close', () => this.clients.delete(ws));
    });
  }

  broadcast(message, sender) {
    this.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

module.exports = { WebSocketManager };