```javascript
const db = require('../db/config');

class UserService {
  static async createUser(email, passwordHash) {
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    return result.rows[0];
  }

  static async getUserByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async updateUserSubscription(userId, status) {
    await db.query(
      'UPDATE users SET subscription_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, userId]
    );
  }
}

module.exports = UserService;
```