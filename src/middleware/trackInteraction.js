```javascript
const interactionService = require('../services/interactionService');

module.exports = async (req, res, next) => {
    try {
        const { funnel_id, user_id, interaction_type, metadata } = req.body;
        await interactionService.createInteraction({ funnel_id, user_id, interaction_type, metadata });
        next();
    } catch (error) {
        console.error('Error tracking interaction:', error);
        next();
    }
};
```