const { createClient } = require('redis'); // Assuming you have installed redis-cli and NodeJS packages for interaction with the client, if not use npm install redis to add it first
const REDIS_CLIENT = createClient({ url: 'your_redis_url' }); // Replace your_redis_url with actual Redis server connection string. For local development this is often localhost and a non-default port (e.g., 6379).
REDIS_CLIENT.connect();
export default REDIS_CLIENT;