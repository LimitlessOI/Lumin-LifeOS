```js
module.exports = {
    kafkaHost: 'kafka:9092',
    clientId: 'aunn-service',
    topics: {
        sensorData: 'sensor-data-topic',
        predictions: 'predictions-topic',
        citizenReports: 'citizen-reports-topic'
    },
    options: {
        connectTimeout: 10000,
        requestTimeout: 30000,
        autoCommit: true,
        autoCommitIntervalMs: 5000,
        fetchMaxWaitMs: 100,
        fetchMinBytes: 1,
        fetchMaxBytes: 1024 * 1024
    }
};
```