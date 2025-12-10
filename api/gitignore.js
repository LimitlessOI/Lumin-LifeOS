```javascript
const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { Pool } = require('pg');
const dbConfig = require('../config/db-config.json');
const pool = new Pool(dbConfig);

// Get current gitignore patterns
router.get('/patterns', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gitignore_patterns');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new gitignore pattern
router.post('/patterns', async (req, res) => {
  const { pattern, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO gitignore_patterns (pattern, description) VALUES ($1, $2) RETURNING *',
      [pattern, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding pattern:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update .gitignore file
router.post('/update', async (req, res) => {
  try {
    const result = await pool.query('SELECT pattern FROM gitignore_patterns');
    const patterns = result.rows.map(row => row.pattern);

    const updateGitignore = require('../scripts/update-gitignore');
    await updateGitignore(patterns);

    res.status(200).json({ message: '.gitignore updated successfully' });
  } catch (error) {
    console.error('Error updating .gitignore:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
```