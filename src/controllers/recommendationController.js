```javascript
const recommendationService = require('../services/recommendationService');

exports.createRecommendation = async (req, res) => {
    try {
        const recommendation = await recommendationService.create(req.body);
        res.status(201).json(recommendation);
    } catch (error) {
        console.error('Error creating recommendation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getRecommendations = async (req, res) => {
    try {
        const recommendations = await recommendationService.findAll();
        res.status(200).json(recommendations);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateRecommendation = async (req, res) => {
    try {
        const updatedRecommendation = await recommendationService.update(req.params.id, req.body);
        res.status(200).json(updatedRecommendation);
    } catch (error) {
        console.error('Error updating recommendation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteRecommendation = async (req, res) => {
    try {
        await recommendationService.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting recommendation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
```