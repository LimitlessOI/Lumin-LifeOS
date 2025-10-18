// server.js
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const webhookHandler = require('./webhookHandler');
const database = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());

// WebSocket connection
wss.on('connection', (ws) => {
    console.log('Client connected');
});

// Vapi webhook endpoint
app.post('/api/v1/sales/coach', webhookHandler(wss));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});