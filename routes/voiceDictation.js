/**
 * SYNOPSIS: HTTP route module — VoiceDictation.
 */
import express from 'express';

const router = express.Router();

function registerVoiceDictationRoutes(app) {
  app.use('/voice-dictation', router);

  router.post('/start', (req, res) => {
    // Logic to start voice dictation using LuminVoice bridge
    res.send({ message: 'Voice dictation started' });
  });

  router.post('/stop', (req, res) => {
    // Logic to stop voice dictation
    res.send({ message: 'Voice dictation stopped' });
  });
}

export { registerVoiceDictationRoutes };