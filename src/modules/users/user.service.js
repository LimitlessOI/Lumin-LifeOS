const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../../database/pool');

const createUser = async (userData) => {
  const { email, password_hash } = userData;
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [email, password_hash]
  );
  return result.rows[0];
};

const getUserById = async (userId) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
};

module.exports = {
  createUser,
  getUserById
};