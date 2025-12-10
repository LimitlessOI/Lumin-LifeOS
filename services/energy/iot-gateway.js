const mqtt = require('mqtt');
const WebSocket = require('ws');
const { addToQueue } = require('./message-queue');

const mqttClient = mqtt.connect('mqtt://broker.hivemq.com');
const wss = new WebSocket.Server({ port: 8080 });

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('energy/+/data', (err) => {
    if (err) console.error('Subscription error:', err);
  });
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message from topic ${topic}: ${message.toString()}`);
  addToQueue(topic, message);
});

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log(`Received message via WebSocket: ${message}`);
    addToQueue('websocket', message);
  });

  ws.send('Connected to IoT Gateway WebSocket');
});

module.exports = { mqttClient, wss };