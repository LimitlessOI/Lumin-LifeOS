```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  });

  try {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/001_create_users_tables.sql')).toString();
    await client.query(sql);
    console.log('Migration ran successfully');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
```