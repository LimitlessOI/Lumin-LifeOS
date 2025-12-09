```javascript
const express = require('express');
const router = express.Router();
const NutritionService = require('../../services/nutrition-service');

router.post('/generate-plan', async (req, res) => {
  try {
    const mealPlan = await NutritionService.generateMealPlan(req.body.preferences);
    res.status(200).json({ mealPlan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```