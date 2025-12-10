const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const config = require('./config');

const app = express();
const pool = new Pool(config.database);

app.use(bodyParser.json());

// Endpoint to check service health
app.get('/health', (req, res) => {
    res.status(200).send('VR Therapy Service is running');
});

// Connect to the database and start the server
pool.connect((err) => {
    if (err) {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    } else {
        console.log('Connected to the database');
        app.listen(config.port, () => {
            console.log(`VR Therapy Service listening on port ${config.port}`);
        });
    }
});

module.exports = app;