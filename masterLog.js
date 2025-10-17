const { Pool } = require('pg');

const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_password',
  port: 5432,
});

async function createMasterLogTable() {
  const query = `CREATE TABLE IF NOT EXISTS master_log (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  await pool.query(query);
}

async function logAction(action) {
  const query = 'INSERT INTO master_log (action) VALUES ($1)';
  await pool.query(query, [action]);
}

module.exports = { createMasterLogTable, logAction };