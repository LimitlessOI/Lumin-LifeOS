const mqtt = require('mqtt');
const amqplib = require('amqplib');
const { EnergyDevice } = require('./models');

const mqttClient = mqtt.connect('mqtt://broker.hivemq.com');

mqttClient.on('connect', () => {
  mqttClient.subscribe('energy/device/data', (err) => {
    if (!err) {
      console.log('Subscribed to energy/device/data');
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    await EnergyDevice.create(data); // Simplified for demonstration
    console.log('Data ingested:', data);
  } catch (error) {
    console.error('Error ingesting data:', error);
  }
});