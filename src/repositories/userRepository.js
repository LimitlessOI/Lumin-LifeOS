```javascript
const { Pool } = require('pg');
const pool = new Pool();

class UserRepository {
    async createUser(username, email, passwordHash) {
        const res = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [username, email, passwordHash]
        );
        return res.rows[0];
    }

    async getUserById(id) {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0];
    }

    async getUserByEmail(email) {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0];
    }
}

module.exports = new UserRepository();
```