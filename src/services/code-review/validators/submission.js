```javascript
const { check, validationResult } = require('express-validator');

exports.validateSubmission = [
    check('name').notEmpty().withMessage('Project name is required'),
    check('repository_url').isURL().withMessage('Invalid repository URL'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
```