```javascript
const { body } = require('express-validator');

const taskValidationRules = () => [
    body('title').isString().isLength({ min: 3, max: 255 }),
    body('description').optional().isString(),
    body('status').isIn(['pending', 'in_progress', 'completed'])
];

module.exports = {
    taskValidationRules
};
```