```javascript
const mqtt = require('mqtt');
const { SensorData, DroneData } = require('../../models/agriculture');

const client = mqtt.connect(process.env.MQTT_BROKER_URL);

client.on('connect', () => {
    console.log('Connected to MQTT Broker');
    client.subscribe('sensors/#');
    client.subscribe('drones/#');
});

client.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        if (topic.startsWith('sensors/')) {
            await SensorData.create({ sensor_id: data.sensor_id, data: data.payload });
        } else if (topic.startsWith('drones/')) {
            await DroneData.create({ drone_id: data.drone_id, data: data.payload });
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

module.exports = client;
```