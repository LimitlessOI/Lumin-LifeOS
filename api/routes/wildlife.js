const express = require('express');
const router = express.Router();
const db = require('../../db');

router.get('/observations', async (req, res) => {
    try {
        const observations = await db.query('SELECT * FROM wildlife_observations');
        res.json(observations.rows);
    } catch (error) {
        console.error('Error fetching observations:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/observation', async (req, res) => {
    const { timestamp, location, species, observed_by, observation_data } = req.body;
    try {
        await db.query(
            'INSERT INTO wildlife_observations (timestamp, location, species, observed_by, observation_data) VALUES ($1, $2, $3, $4, $5)',
            [timestamp, location, species, observed_by, observation_data]
        );
        res.status(201).send('Observation added');
    } catch (error) {
        console.error('Error adding observation:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;