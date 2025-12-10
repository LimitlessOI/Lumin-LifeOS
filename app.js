const express = require('express');
const { fetchBiometricData } = require('./services/abi/biometricIngestion');
const { processBiometricData } = require('./services/abi/recommendationEngine');
const { sequelize } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/v1/abi/recommendations', async (req, res) => {
  const { userId } = req.query;
  try {
    const recommendations = await AdaptiveRecommendation.findAll({ where: { userId } });
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`ABI System microservice running on port ${PORT}`);
  });
});