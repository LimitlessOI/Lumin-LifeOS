```javascript
const NutritionService = require('../services/nutrition-service');

describe('NutritionService', () => {
  beforeAll(async () => {
    await NutritionService.init();
  });

  test('generateMealPlan should return a valid plan', async () => {
    const preferences = [/* Mocked user preferences */];
    const mealPlan = await NutritionService.generateMealPlan(preferences);
    expect(mealPlan).toBeDefined();
  });
});
```