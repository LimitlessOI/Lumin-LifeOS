/**
 * SYNOPSIS: HTTP route module — Likeness Consent.
 * @ssot docs/products/creator-media-os/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();
const consents = new Map();

function captureLikenessConsent(userId) {
  consents.set(userId, true);
  return { userId, consentGiven: true, message: 'Explicit likeness consent recorded' };
}

function revokeLikenessConsent(userId) {
  consents.delete(userId);
  return { userId, consentGiven: false };
}

// POST /api/v1/likeness/consent
router.post('/', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  const result = captureLikenessConsent(userId);
  res.json(result);
});

// POST /api/v1/likeness/consent/revoke
router.post('/revoke', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  const result = revokeLikenessConsent(userId);
  res.json(result);
});

export function registerLikenessConsentRoutes(app) {
  app.use('/api/v1/likeness/consent', router);
}
