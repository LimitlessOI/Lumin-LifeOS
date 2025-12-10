```javascript
const interactionService = require('../services/interactionService');
const Joi = require('joi');

const interactionSchema = Joi.object({
    funnel_id: Joi.number().integer().required(),
    user_id: Joi.number().integer().optional(),
    interaction_type: Joi.string().max(100).required(),
    metadata: Joi.object().optional()
});

exports.recordInteraction = async (req, res) => {
    try {
        await interactionSchema.validateAsync(req.body);
        const interaction = await interactionService.createInteraction(req.body);
        res.status(201).json(interaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getInteractions = async (req, res) => {
    try {
        const interactions = await interactionService.getInteractions();
        res.status(200).json(interactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```