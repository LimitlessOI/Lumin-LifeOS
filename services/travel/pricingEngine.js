```javascript
const logger = require('../../utils/logger');

function calculatePrice(basePrice, demandFactor, seasonFactor) {
  try {
    const price = basePrice * demandFactor * seasonFactor;
    return price;
  } catch (error) {
    logger.error('Error calculating price:', error);
    throw new Error('Could not calculate price');
  }
}

function trackBudget(itinerary, userBudget) {
  try {
    const totalCost = itinerary.details.reduce((sum, item) => sum + item.price, 0);
    return userBudget >= totalCost;
  } catch (error) {
    logger.error('Error tracking budget:', error);
    throw new Error('Could not track budget');
  }
}

module.exports = {
  calculatePrice,
  trackBudget
};
```