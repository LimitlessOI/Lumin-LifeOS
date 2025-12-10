const io = require('socket.io')(3004);

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('message', (data) => {
        console.log('Received message:', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server running on port 3004');