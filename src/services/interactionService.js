```javascript
const FunnelInteraction = require('../models/FunnelInteraction');

exports.createInteraction = async (interactionData) => {
    return await FunnelInteraction.create(interactionData);
};

exports.getInteractions = async () => {
    return await FunnelInteraction.findAll();
};
```