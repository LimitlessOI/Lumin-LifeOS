```javascript
const { generateRecommendations } = require('../../ml/recommendation_engine.py');
const db = require('../../models');
const logger = require('../../utils/logger');

async function generateItinerary(userId) {
  try {
    const preferences = await db.user_profiles.findOne({ where: { user_id: userId } });
    const recommendations = await generateRecommendations(preferences);
    const itinerary = await db.itineraries.create({
      user_id: userId,
      details: recommendations
    });
    return itinerary;
  } catch (error) {
    logger.error('Error generating itinerary:', error);
    throw new Error('Could not generate itinerary');
  }
}

module.exports = {
  generateItinerary
};
```