```javascript
const tf = require('@tensorflow/tfjs-node');
const { loadModel } = require('../../ml-models/nutrition-recommender/model.json');

class NutritionService {
  constructor() {
    this.model = null;
  }

  async init() {
    this.model = await loadModel();
  }

  async generateMealPlan(userPreferences) {
    if (!this.model) throw new Error('Model not loaded');
    // Example logic to generate a meal plan
    const prediction = this.model.predict(tf.tensor(userPreferences));
    return prediction.dataSync();
  }
}

module.exports = new NutritionService();
```