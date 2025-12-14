```javascript
const AiModelFunnel = require('../models/AiModelFunnel');

const seedData = async () => {
  try {
    await AiModelFunnel.bulkCreate([
      { ai_model_id: 1, funnel_id: 1, performance_metrics: { accuracy: 0.9 } },
      { ai_model_id: 2, funnel_id: 1, performance_metrics: { accuracy: 0.85 } },
      { ai_model_id: 1, funnel_id: 2, performance_metrics: { accuracy: 0.87 } },
    ]);
    console.log('Seeding completed.');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

seedData();
```