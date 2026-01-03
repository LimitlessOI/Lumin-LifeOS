// File: routes/api.js (Express Router setups) ===END FILE===
const express = require('express');
const router = new express.Router();

router.get('/overlays', async (req, res) => {
    // Fetch overlays from the database and send back as JSON response
});

router.post('/interactions/create', async (req, res) => {
    // Record user interaction with an overlay into the interactions table in Neon PostgreSQL DB
});

module.exports = router;