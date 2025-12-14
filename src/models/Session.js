```javascript
const { Pool } = require('pg');
const pool = new Pool();

const createSession = async (userId, token, expiresAt) => {
  const result = await pool.query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
    [userId, token, expiresAt]
  );
  return result.rows[0];
};

const deleteSession = async (token) => {
  await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
};

const findSessionByToken = async (token) => {
  const result = await pool.query('SELECT * FROM sessions WHERE token = $1', [token]);
  return result.rows[0];
};

module.exports = { createSession, deleteSession, findSessionByToken };
```