```javascript
const mqtt = require('mqtt');
const PanelSensorData = require('../../models/PanelSensorData');

const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe('biohybrid/panel/sensor');
});

client.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        await PanelSensorData.create({
            panel_id: data.panelId,
            sensor_type: data.sensorType,
            data: data.sensorData
        });
        console.log('Sensor data stored:', data);
    } catch (error) {
        console.error('Error processing sensor data:', error);
    }
});

module.exports = client;
```