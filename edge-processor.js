```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', function () {
    client.subscribe('iot/data', function (err) {
        if (!err) {
            console.log("Subscribed to iot/data");
        }
    });
});

client.on('message', function (topic, message) {
    if (topic === 'iot/data') {
        processIoTData(JSON.parse(message.toString()));
    }
});

function processIoTData(data) {
    console.log("Processing IoT data:", data);
    // Add processing logic here
}

module.exports = { processIoTData };
```