```javascript
const pool = require('../db'); // Assume a configured pg Pool instance is exported from ../db

async function findUserByUsername(username) {
    const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return res.rows[0];
}

async function createUser(username, passwordHash) {
    const res = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
        [username, passwordHash]
    );
    return res.rows[0];
}

module.exports = {
    findUserByUsername,
    createUser
};
```