const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
  user: 'your_db_user',
  host: 'localhost',
  database: 'learning_cortex',
  password: 'your_db_password',
  port: 5432,
});

// POST /learning-profile
app.post('/learning-profile', async (req, res) => {
  try {
    const { user_id, preferences } = req.body;
    const result = await pool.query(
      'INSERT INTO learning_profiles (user_id, preferences) VALUES ($1, $2) RETURNING *',
      [user_id, preferences]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating learning profile');
  }
});

// GET /learning-profile/:id
app.get('/learning-profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM learning_profiles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).send('Profile not found');
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving learning profile');
  }
});

// PUT /learning-profile/:id
app.put('/learning-profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { preferences } = req.body;
    const result = await pool.query(
      'UPDATE learning_profiles SET preferences = $1 WHERE id = $2 RETURNING *',
      [preferences, id]
    );
    if (result.rows.length === 0) {
      res.status(404).send('Profile not found');
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating learning profile');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});