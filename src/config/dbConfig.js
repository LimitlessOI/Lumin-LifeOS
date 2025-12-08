```javascript
const { Pool } = require('pg');
const Redis = require('ioredis');

// PostgreSQL configuration
const pool = new Pool({
  user: 'your_postgres_user',
  host: 'your_postgres_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

// Redis configuration
const redis = new Redis({
  host: 'your_redis_host',
  port: 6379,
});

module.exports = {
  pool,
  redis,
};
```