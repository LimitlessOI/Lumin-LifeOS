const express = require('express');
const { body, validationResult } = require('express-validator');
const { checkCompliance } = require('../../services/energy/compliance-engine');
const { predictEnergyPrice, getWeatherData } = require('../../services/energy/prediction-engine');

const router = express.Router();

router.post('/energy/transaction', [
  body('userId').isInt(),
  body('amount').isFloat()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    await checkCompliance(req.body.userId, req.body);
    res.status(200).send('Transaction is compliant');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.get('/energy/predict', async (req, res) => {
  try {
    const weatherData = await getWeatherData('New York');
    const prediction = await predictEnergyPrice(weatherData);
    res.status(200).json({ prediction });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;