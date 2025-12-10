```javascript
const redis = require('redis');
const socketIo = require('socket.io');

function setupEventProcessor(server) {
  const io = socketIo(server);
  const redisClient = redis.createClient();

  redisClient.on('message', (channel, message) => {
    io.emit(channel, message);
  });

  io.on('connection', (socket) => {
    console.log('New WebSocket connection');
  });
}

module.exports = { setupEventProcessor };
```