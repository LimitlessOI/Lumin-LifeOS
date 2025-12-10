```javascript
const socketIo = require('socket.io');

function setupSyncService(server) {
    const io = socketIo(server);
    io.on('connection', (socket) => {
        console.log('Device connected:', socket.id);
        socket.on('sync', (data) => {
            console.log('Sync data:', data);
            socket.emit('sync_ack', { status: 'success' });
        });
    });
}

module.exports = setupSyncService;
```