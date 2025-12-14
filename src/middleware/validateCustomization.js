```javascript
const Joi = require('joi');

const customizationSchema = Joi.object({
    name: Joi.string().required(),
    value: Joi.object().required(),
    scenario_id: Joi.number().integer().required()
});

function validateCustomization(req, res, next) {
    const { error } = customizationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
}

module.exports = validateCustomization;
```