```javascript
const express = require('express');
const recommendationController = require('../controllers/recommendationController');

const router = express.Router();

router.post('/recommendations', recommendationController.createRecommendation);
router.get('/recommendations', recommendationController.getRecommendations);
router.put('/recommendations/:id', recommendationController.updateRecommendation);
router.delete('/recommendations/:id', recommendationController.deleteRecommendation);

module.exports = router;
```