const redis = require('redis');

const ALERT_THRESHOLD = 0.7;
const redisClient = redis.createClient();

redisClient.subscribe('wildlife_data');

redisClient.on('message', (channel, message) => {
    const data = JSON.parse(message);
    if (data.prediction_score > ALERT_THRESHOLD) {
        triggerAlert(data);
    }
});

function triggerAlert(data) {
    console.log('Alert triggered:', data);
    // Add integration with notification system here
}

console.log('Alert Engine is running...');