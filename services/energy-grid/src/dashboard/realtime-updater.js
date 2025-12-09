```javascript
const socketIo = require('socket.io');
const http = require('http');

const server = http.createServer();
const io = socketIo(server);

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    // Emit updates periodically
    setInterval(() => {
        socket.emit('update', { data: 'real-time data' });
    }, 1000);
});

server.listen(4000, () => {
    console.log('WebSocket server listening on port 4000');
});

module.exports = {
    io
};
```