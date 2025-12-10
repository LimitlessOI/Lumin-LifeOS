const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.post('/:platform', async (req, res) => {
  const { platform } = req.params;
  const eventData = req.body;

  try {
    // Validate and process the webhook event
    // Example: Insert event data into funnel_events table
    await db.query('INSERT INTO funnel_events (customer_id, event_type, event_data) VALUES ($1, $2, $3)', [eventData.customer_id, eventData.event_type, eventData]);

    res.status(200).send('Event processed');
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;