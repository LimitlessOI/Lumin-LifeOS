const pool = require('../utils/database');

class User {
  static async getAll() {
    const res = await pool.query('SELECT * FROM users');
    return res.rows;
  }

  static async create({ name, email }) {
    const res = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return res.rows[0];
  }

  static async getById(id) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  }

  static async update(id, { name, email }) {
    const res = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, id]
    );
    return res.rows[0];
  }

  static async delete(id) {
    const res = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return res.rowCount > 0;
  }
}

module.exports = User;