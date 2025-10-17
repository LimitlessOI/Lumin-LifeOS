const { Pool } = require('pg');

const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_password',
  port: 5432,
});

async function createIdeasTable() {
  const query = `CREATE TABLE IF NOT EXISTS ideas (
    id SERIAL PRIMARY KEY,
    idea TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  await pool.query(query);
}

async function addIdea(idea) {
  const query = 'INSERT INTO ideas (idea) VALUES ($1)';
  await pool.query(query, [idea]);
}

module.exports = { createIdeasTable, addIdea };