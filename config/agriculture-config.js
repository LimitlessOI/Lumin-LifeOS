```javascript
module.exports = {
    mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    weatherApiKey: process.env.WEATHER_API_KEY,
    databaseUrl: process.env.DATABASE_URL
};
```