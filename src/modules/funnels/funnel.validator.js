```javascript
const { body, validationResult } = require('express-validator');

exports.validateFunnel = [
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
```