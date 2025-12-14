```javascript
const Joi = require('joi');

const taskSchema = {
  create: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    status: Joi.string().valid('pending', 'in-progress', 'completed').optional(),
  }),
  update: Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    status: Joi.string().valid('pending', 'in-progress', 'completed').optional(),
  }),
};

const create = (req, res, next) => {
  const { error } = taskSchema.create.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const update = (req, res, next) => {
  const { error } = taskSchema.update.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = { create, update };
```