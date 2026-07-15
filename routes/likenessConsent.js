/**
 * SYNOPSIS: HTTP route module — LikenessConsent.
 */
import express from 'express';

const likenessConsents = new Map();

function captureLikenessConsent(userId) {
  likenessConsents.set(userId, true);
  return { userId, consentGiven: true };
}

function revokeLikenessConsent(userId) {
  likenessConsents.delete(userId);
  return { userId, consentGiven: false };
}

function registerLikenessConsentRoutes(app) {
  const router = express.Router();

  router.post('/consent/capture', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const result = captureLikenessConsent(userId);
    res.json(result);
  });

  router.post('/consent/revoke', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const result = revokeLikenessConsent(userId);
    res.json(result);
  });

  app.use('/likeness', router);
}

export { registerLikenessConsentRoutes };
