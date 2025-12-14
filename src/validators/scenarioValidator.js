```javascript
const { body } = require('express-validator');

module.exports = [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString().withMessage('Description must be a string')
];
```