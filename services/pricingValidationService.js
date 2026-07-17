/**
 * SYNOPSIS: services/pricingValidationService.js
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
// services/pricingValidationService.js

/**
 * Validates a given price against business rules and market trends.
 * @param {number} price - The price to validate.
 * @param {Function} [feedbackCallback] - Optional callback to receive validation errors.
 * @returns {boolean} - True if the price is valid, false otherwise.
 */
function validatePricing(price, feedbackCallback) {
  const errors = [];

  if (price < 0) {
    errors.push('Price cannot be negative.');
  }

  if (price > 10000) {
    errors.push('Price exceeds the maximum allowed limit.');
  }

  const marketTrends = getMarketTrends();
  if (marketTrends.priceIncrease && price < marketTrends.minPrice) {
    errors.push(`Price is too low according to current market trends. Minimum suggested price is ${marketTrends.minPrice}.`);
  }

  if (feedbackCallback && typeof feedbackCallback === 'function') {
    feedbackCallback(errors);
  }

  return errors.length === 0;
}

/**
 * Provides detailed feedback on a given price based on business rules and market analysis.
 * @param {number} price - The price to get feedback for.
 * @returns {Array<Object>} - A list of feedback objects, each with an 'issue' and 'message'.
 */
function getPricingFeedback(price) {
  const feedback = [];

  if (price < 0) {
    feedback.push({ issue: 'negative', message: 'Price cannot be negative.' });
  }

  if (price > 10000) {
    feedback.push({ issue: 'exceedsLimit', message: 'Price exceeds the maximum allowed limit.' });
  }

  const marketTrends = getMarketTrends();
  if (marketTrends.priceIncrease && price < marketTrends.minPrice) {
    feedback.push({ issue: 'belowMarket', message: `Price is too low according to current market trends. Minimum suggested price is ${marketTrends.minPrice}.` });
  }

  return feedback;
}

/**
 * Mock function to simulate fetching market trend data.
 * @returns {Object} - An object containing market trend information.
 */
function getMarketTrends() {
  return {
    priceIncrease: true,
    minPrice: 500
  };
}

export { validatePricing, getPricingFeedback };
