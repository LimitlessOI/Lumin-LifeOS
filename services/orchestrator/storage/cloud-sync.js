```javascript
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.NEON_PG_CONNECTION_STRING,
});

client.connect()
  .then(() => console.log('Connected to Neon PostgreSQL'))
  .catch(err => console.error('Connection error', err.stack));

const syncData = async (data) => {
  try {
    await client.query('INSERT INTO tasks(name, status) VALUES($1, $2)', [data.name, data.status]);
    console.log('Data synced with cloud');
  } catch (error) {
    console.error('Error syncing data: ', error);
  }
};

module.exports = syncData;
```