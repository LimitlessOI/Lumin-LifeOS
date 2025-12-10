```js
const { Server } = require('socket.io');
const Peer = require('peer');

const io = new Server(3000); // Port configuration as needed
const peerServer = Peer.ExpressPeerServer(io, { debug: true });

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit('user-connected', userId);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

module.exports = { io, peerServer };
```