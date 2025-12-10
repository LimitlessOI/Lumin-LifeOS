```javascript
const redis = require('../config/redis');
const EthicalDecision = require('../models/EthicalDecision');

class DecisionAnalyzer {
    static async analyzeDecision(decisionText) {
        try {
            const decision = await EthicalDecision.create({ decisionText });

            // Publish to Redis for further processing
            redis.publish('decision_channel', JSON.stringify({
                decisionId: decision.id,
                decisionText: decisionText
            }));

            console.log('Decision analyzed and queued:', decisionText);
            return decision;
        } catch (error) {
            console.error('Error analyzing decision:', error);
            throw error;
        }
    }
}

module.exports = DecisionAnalyzer;
```