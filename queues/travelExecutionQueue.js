```javascript
const Queue = require('bull');
const itineraryService = require('../services/travel/itineraryGenerator');
const logger = require('../utils/logger');

const travelQueue = new Queue('travelQueue', {
  redis: { host: '127.0.0.1', port: 6379 } // Example Redis configuration
});

travelQueue.process(async (job) => {
  try {
    const itinerary = await itineraryService.generateItinerary(job.data.userId);
    return itinerary;
  } catch (error) {
    logger.error('Error processing travel queue:', error);
    throw error;
  }
});

function queueItineraryGeneration(userId) {
  travelQueue.add({ userId });
}

module.exports = {
  queueItineraryGeneration
};
```