const mqtt = require('mqtt');
const WebSocket = require('ws');
const redis = require('redis');

const MQTT_BROKER_URL = 'mqtt://broker.example.com';
const WS_PORT = 8080;
const REDIS_CHANNEL = 'wildlife_data';

// MQTT Client
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe('wildlife/observations');
});

mqttClient.on('message', (topic, message) => {
    console.log(`Received MQTT message: ${message.toString()}`);
    redisClient.publish(REDIS_CHANNEL, message.toString());
});

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log(`Received WS message: ${message}`);
        redisClient.publish(REDIS_CHANNEL, message);
    });
});

// Redis Client
const redisClient = redis.createClient();

redisClient.on('error', (err) => {
    console.error(`Redis error: ${err}`);
});

console.log('IoT Gateway is running...');