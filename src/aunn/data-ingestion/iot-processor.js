```js
const { Client } = require('pg');
const lorawan = require('node-red-contrib-lorawan');
const kafka = require('kafka-node');
const kafkaConfig = require('../config/kafka-config');

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
});

pgClient.connect();

const kafkaClient = new kafka.KafkaClient({ kafkaHost: kafkaConfig.kafkaHost });
const producer = new kafka.Producer(kafkaClient);

producer.on('ready', () => {
    console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (err) => {
    console.error('Kafka Producer error:', err);
});

const processSensorData = (data) => {
    const query = 'INSERT INTO sensor_data(sensor_id, data) VALUES($1, $2)';
    const values = [data.sensorId, JSON.stringify(data.payload)];

    pgClient.query(query, values, (err, res) => {
        if (err) {
            console.error('Error inserting sensor data:', err);
        } else {
            console.log('Sensor data inserted:', res.rows);
            const payloads = [{ topic: kafkaConfig.topics.sensorData, messages: JSON.stringify(data) }];
            producer.send(payloads, (err, data) => {
                if (err) {
                    console.error('Error sending data to Kafka:', err);
                } else {
                    console.log('Data sent to Kafka:', data);
                }
            });
        }
    });
};

// Example integration with LoRaWAN
lorawan.on('uplink', (msg) => {
    console.log('Received uplink message:', msg);
    processSensorData(msg);
});

module.exports = { processSensorData };
```