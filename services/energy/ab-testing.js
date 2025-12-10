const { trackBehavior } = require('./gamification-service');

function abTestFeature(userId, featureFlag) {
  if (featureFlag === 'new-gamification') {
    trackBehavior(userId, 'new-feature');
  } else {
    trackBehavior(userId, 'old-feature');
  }
}

module.exports = { abTestFeature };