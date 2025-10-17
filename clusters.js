const { Pool } = require('pg');

const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_password',
  port: 5432,
});

async function createClustersTable() {
  const query = `CREATE TABLE IF NOT EXISTS clusters (
    id SERIAL PRIMARY KEY,
    idea_id INT REFERENCES ideas(id),
    cluster_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  await pool.query(query);
}

async function addToCluster(ideaId, clusterName) {
  const query = 'INSERT INTO clusters (idea_id, cluster_name) VALUES ($1, $2)';
  await pool.query(query, [ideaId, clusterName]);
}

module.exports = { createClustersTable, addToCluster };