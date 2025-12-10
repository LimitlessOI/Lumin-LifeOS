```javascript
const router = require('./routes');
const stripeService = require('./services/stripeService');
const analysisEngine = require('./services/analysisEngine');
const queueService = require('./services/queueService');

module.exports = {
  router,
  stripeService,
  analysisEngine,
  queueService
};
```