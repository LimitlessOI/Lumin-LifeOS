```javascript
const WebSocket = require('ws');
const redis = require('redis');
const { Sequelize } = require('sequelize');

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Initialize Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Initialize Sequelize for PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

// Define a simple model for Biometric Streams
const BiometricStream = sequelize.define('biometric_stream', {
  streamId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: Sequelize.UUID,
    allowNull: false
  },
  data: {
    type: Sequelize.JSON,
    allowNull: false
  }
});

// Sync database models
sequelize.sync().then(() => {
  console.log('Database models synchronized for biometric streams.');
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const stream = await BiometricStream.create({
        sessionId: data.sessionId,
        data: data
      });
      console.log('Biometric data saved:', stream.streamId);
    } catch (error) {
      console.error('Error processing biometric data:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
```