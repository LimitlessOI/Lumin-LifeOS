const express = require('express');
const { VRSession } = require('../models/vr-models');
const { renderVRSession } = require('../services/vr-experience/engine');
const { interactWithGuide } = require('../services/ai-interaction/guide-ai');
const { syncRealWorldData } = require('../services/data-sync/real-world-api');

const router = express.Router();

router.post('/session', async (req, res) => {
  try {
    const session = await VRSession.create(req.body);
    renderVRSession(session.id);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create VR session' });
  }
});

router.post('/guide', async (req, res) => {
  try {
    const response = await interactWithGuide(req.body.userInput);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'AI interaction failed' });
  }
});

router.get('/sync', async (req, res) => {
  try {
    const data = await syncRealWorldData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

module.exports = router;