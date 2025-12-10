```js
const express = require('express');
const jwt = require('jsonwebtoken');
const LearningProfile = require('../models/LearningProfile');
const AdaptiveLearningEngine = require('../services/adaptiveModel');

const router = express.Router();

router.use((req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send({ auth: false, message: 'No token provided.' });

  jwt.verify(token, 'your-secret-key', (err, decoded) => {
    if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
    req.userId = decoded.id;
    next();
  });
});

router.get('/profile', async (req, res) => {
  try {
    const profile = await LearningProfile.findOne({ where: { userId: req.userId } });
    res.json(profile);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

router.post('/predict', (req, res) => {
  const prediction = AdaptiveLearningEngine.predict(req.body.preferences);
  res.json(prediction);
});

module.exports = router;
```