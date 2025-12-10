```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', function () {
    console.log("MQTT Bridge connected");
});

function publishData(topic, data) {
    client.publish(topic, JSON.stringify(data), function (err) {
        if (err) {
            console.error("Failed to publish data:", err);
        } else {
            console.log("Data published to topic:", topic);
        }
    });
}

module.exports = { publishData };
```