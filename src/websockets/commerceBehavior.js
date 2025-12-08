```javascript
const socketIo = require('socket.io');

function setupWebSockets(server) {
  const io = socketIo(server);

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('behavior', (data) => {
      console.log('User behavior:', data);
      // Logic to handle real-time user behavior
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}

module.exports = setupWebSockets;
```