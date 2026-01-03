const express = require('express');
const router = express.Router();
const dbConnection = {}; // Assume this is set up with Neon PostgreSQL database connection details elsewhere in your codebase.

router.get('/roi', async (req, res) => {
  try {
    const roiData = await dbConnection.query('SELECT * FROM roi');
    res.json(roiData);
  } catch (error) {
    res.status(500).send('Server Error');
 01-api/v1/campaigns GET ENDPOINT:
router.get('/campaigns', async (req, res) => {
  try {
    const campaignData = await dbConnection.query('SELECT * FROM campaigns WHERE end_date >= CURRENT_DATE'); // Ensuring recent data is returned for current analysis. Adjust as necessary for your business logic and requirements.
    res.json(campaignData);
  } catch (error) {
    res.status(500).send('Server Error');
  }
});