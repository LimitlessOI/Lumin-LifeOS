const redis = require('redis');
const { promisify } = require('util');

const REDIS_CHANNEL = 'wildlife_data';

const redisClient = redis.createClient();
const xreadAsync = promisify(redisClient.xread).bind(redisClient);

async function processStream() {
    try {
        const streamData = await xreadAsync('BLOCK', 0, 'STREAMS', REDIS_CHANNEL, '$');
        streamData.forEach((stream) => {
            console.log('Processing stream data:', stream);
            // Add processing logic here
        });
    } catch (error) {
        console.error('Error processing stream:', error);
    }
}

processStream();
console.log('Stream Processor is running...');