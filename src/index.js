const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const winston = require('winston');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool();

app.use(express.json());

// Placeholder for API endpoints
app.get('/', (req, res) => {
  res.send('LifeOS Backend is running');
});

// Start server
app.listen(port, () => {
  winston.info(`Server is running on port ${port}`);
});