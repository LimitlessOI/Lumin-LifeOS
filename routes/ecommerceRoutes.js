const express = require('express');
const segmentationService = require('../services/ecommerce/ml/segmentationService');
const recommendationEngine = require('../services/ecommerce/ml/recommendationEngine');
const funnelOptimizer = require('../controllers/funnelOptimizer');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/api/v1/ecommerce/segment', async (req, res) => {
    try {
        const segments = await segmentationService.performClustering(req.body.data);
        res.json({ segments });
    } catch (error) {
        logger.error('Segmentation error:', error);
        res.status(500).json({ error: 'Segmentation failed' });
    }
});

router.get('/api/v1/ecommerce/recommendations/:customerId', async (req, res) => {
    try {
        const recommendations = recommendationEngine.getRecommendations(req.params.customerId);
        res.json({ recommendations });
    } catch (error) {
        logger.error('Recommendation error:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

router.post('/api/v1/ecommerce/funnel/optimize', funnelOptimizer.optimize);

module.exports = router;