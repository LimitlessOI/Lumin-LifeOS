```javascript
const express = require('express');
const profileService = require('../services/travel/profileService');
const queueService = require('../queues/travelExecutionQueue');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/profile', async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    const profile = await profileService.createUserProfile(userId, preferences);
    res.status(201).json(profile);
  } catch (error) {
    logger.error('Error creating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    const profile = await profileService.updateUserProfile(userId, preferences);
    res.status(200).json(profile);
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/itinerary', async (req, res) => {
  try {
    const { userId } = req.body;
    queueService.queueItineraryGeneration(userId);
    res.status(202).json({ message: 'Itinerary generation queued' });
  } catch (error) {
    logger.error('Error queuing itinerary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```